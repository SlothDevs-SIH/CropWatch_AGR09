"""Fetch real Sentinel-2 greenness per 200 m cell for sample boxes in Jalna district.

For each taluka, one 4 km x 4 km sample box is read from every scene, June to October,
2023 to 2026. Each box becomes a 20 x 20 grid of 200 m cells (the demo's "plots").
Output: ../data/raw/<taluka>.npz  (dates, ndvi[scene,20,20] with NaN where not clear)
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

import s2lite as s2  # noqa: E402

from config import TALUKAS, YEARS, MONTHS, box_for  # noqa: E402

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
CLEAR = [4, 5]  # SCL: vegetation, bare soil
PX = 200        # 20 m pixels across 4 km
CELL = 10       # 10 x 10 pixels = 200 m cell


def read_scene(args):
    bbox, sc = args
    try:
        with s2._open(sc.href("B04")) as ref:
            b = transform_bounds("EPSG:4326", ref.crs, *bbox)

        def rd(band, rs):
            with s2._open(sc.href(band)) as s:
                return s.read(1, window=from_bounds(*b, s.transform), out_shape=(PX, PX),
                              resampling=rs, boundless=True, fill_value=0).astype(np.float32)
        red, nir, scl = rd("B04", Resampling.bilinear), rd("B08", Resampling.bilinear), rd("SCL", Resampling.nearest)
        off = s2.detect_offset(sc.baseline, red)
        red, nir = (red - off) / 10000.0, (nir - off) / 10000.0
        ok = np.isin(scl, CLEAR) & (red + nir > 0)
        ndvi = np.where(ok, (nir - red) / np.maximum(nir + red, 1e-6), np.nan)
        n = PX // CELL
        blocks = ndvi.reshape(n, CELL, n, CELL).transpose(0, 2, 1, 3).reshape(n, n, CELL * CELL)
        cnt = np.isfinite(blocks).sum(-1)
        with np.errstate(all="ignore"):
            med = np.nanmedian(blocks, axis=-1)
        med[cnt < 30] = np.nan
        return sc.date.isoformat(), med.astype(np.float32), float(ok.mean())
    except Exception as e:
        return None


def scenes_for(lat, lon, bbox, years):
    seen, out = set(), []
    corners = [(bbox[1], bbox[0]), (bbox[1], bbox[2]), (bbox[3], bbox[0]), (bbox[3], bbox[2]), (lat, lon)]
    tiles = list(dict.fromkeys(s2.mgrs_tile(a, b) for a, b in corners))
    months = [(y, m) for y in years for m in MONTHS]
    for t in tiles:
        for sc in s2.search(t, months, max_cloud=100.0, bbox_ll=bbox):
            if sc.date not in seen:
                seen.add(sc.date)
                out.append(sc)
    return tiles, out


def main():
    import argparse
    ap = argparse.ArgumentParser(description="Fetch Sentinel-2 greenness per 200 m cell for the Jalna sample boxes.")
    ap.add_argument("talukas", nargs="*", help="taluka names (default: all)")
    ap.add_argument("--years", nargs="+", type=int, default=YEARS, help="seasons to read (default: 2023 to 2026)")
    ap.add_argument("--tag", default="", help="suffix for the output file, e.g. _hist for past seasons")
    a = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    report = {}
    for name in (a.talukas or list(TALUKAS)):
        lat, lon = TALUKAS[name]["lat"], TALUKAS[name]["lon"]
        bbox = box_for(lat, lon)
        tiles, scenes = scenes_for(lat, lon, bbox, a.years)
        print(f"{name}: tiles {tiles}, {len(scenes)} scenes", flush=True)
        if not scenes:
            report[name] = "no scenes cover the box"
            continue
        with ThreadPoolExecutor(max_workers=8) as pool:
            res = [r for r in pool.map(read_scene, [(bbox, sc) for sc in scenes]) if r]
        res.sort(key=lambda r: r[0])
        np.savez_compressed(RAW / f"{name}{a.tag}.npz", dates=np.array([r[0] for r in res]),
                            ndvi=np.stack([r[1] for r in res]), clear=np.array([r[2] for r in res]),
                            bbox=np.array(bbox))
        report[name] = f"{len(res)} scenes read"
        print(f"  saved {name}{a.tag}: {report[name]}", flush=True)
    (RAW / f"fetch_report{a.tag}.json").write_text(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
