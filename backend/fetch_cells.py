"""Fetch real Sentinel-2 greenness per cell, for the 4 km sample boxes and for whole-taluka areas.

  python fetch_cells.py                        every sample box, seasons 2023 to 2026
  python fetch_cells.py Partur Ambad           chosen sample boxes
  python fetch_cells.py PartWhole              a whole-taluka area (see config.AREAS), coarser cells
  python fetch_cells.py --years 2019 2020 2021 2022 --tag _hist     past seasons into <name>_hist.npz

Each cell is the median greenness of its clear pixels in a scene (cloud, shadow, water and snow masked by the scene classification layer).
Output: ../data/raw/<name><tag>.npz  (dates, ndvi[scene, rows, cols] with NaN where not clear, bbox)
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds
from shapely.geometry import box as sbox, shape

import s2lite as s2
from config import AREAS, MONTHS, TALUKAS, YEARS, area_spec, sample_spec

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
CLEAR = [4, 5]  # scene classification: vegetation, bare soil


def read_scene(args):
    bbox, sc, rows, cols, cell_px = args
    try:
        with s2._open(sc.href("B04")) as ref:
            b = transform_bounds("EPSG:4326", ref.crs, *bbox)
        shape_px = (rows * cell_px, cols * cell_px)

        def rd(band, rs):
            with s2._open(sc.href(band)) as s:
                return s.read(1, window=from_bounds(*b, s.transform), out_shape=shape_px,
                              resampling=rs, boundless=True, fill_value=0).astype(np.float32)
        red, nir, scl = rd("B04", Resampling.bilinear), rd("B08", Resampling.bilinear), rd("SCL", Resampling.nearest)
        off = s2.detect_offset(sc.baseline, red)
        red, nir = (red - off) / 10000.0, (nir - off) / 10000.0
        ok = np.isin(scl, CLEAR) & (red + nir > 0)                   # pixels outside this scene's footprint read as 0 and drop out here
        ndvi = np.where(ok, (nir - red) / np.maximum(nir + red, 1e-6), np.nan)
        blocks = ndvi.reshape(rows, cell_px, cols, cell_px).transpose(0, 2, 1, 3).reshape(rows, cols, cell_px * cell_px)
        cnt = np.isfinite(blocks).sum(-1)
        with np.errstate(all="ignore"):
            med = np.nanmedian(blocks, axis=-1)
        med[cnt < max(3, int(np.ceil(0.3 * cell_px * cell_px)))] = np.nan      # a cell needs 30% of its pixels clear (30 of 100 for 200 m cells)
        return sc.date.isoformat(), med.astype(np.float32)
    except Exception:
        return None


def scenes_for(spec, years):
    """Scenes for every tile the area touches. A small box must lie wholly inside one scene; a big area may need two tiles per day."""
    bbox = spec["bbox"]
    lat, lon = (bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2
    corners = [(bbox[1], bbox[0]), (bbox[1], bbox[2]), (bbox[3], bbox[0]), (bbox[3], bbox[2]), (lat, lon)]
    tiles = list(dict.fromkeys(s2.mgrs_tile(a, b) for a, b in corners))
    months = [(y, m) for y in years for m in MONTHS]
    whole = spec["kind"] == "whole_taluka"
    target, out, seen = sbox(*bbox), [], set()
    for t in tiles:
        for sc in s2.search(t, months, max_cloud=100.0, bbox_ll=None if whole else bbox):
            if whole:
                if sc.footprint is not None and not shape(sc.footprint).buffer(0).intersects(target):
                    continue                                          # this pass does not touch the area at all
                key = sc.id
            else:
                key = sc.date
            if key not in seen:
                seen.add(key)
                out.append(sc)
    return tiles, out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("names", nargs="*", help="sample-box talukas and/or whole-taluka areas (default: every sample box)")
    ap.add_argument("--years", nargs="+", type=int, default=YEARS, help="seasons to read (default: 2023 to 2026)")
    ap.add_argument("--tag", default="", help="suffix for the output file, e.g. _hist for past seasons")
    a = ap.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    report = {}
    for name in (a.names or list(TALUKAS)):
        spec = area_spec(name) if name in AREAS else sample_spec(name)
        tiles, scenes = scenes_for(spec, a.years)
        print(f"{name}: grid {spec['rows']} x {spec['cols']}, tiles {tiles}, {len(scenes)} scenes", flush=True)
        if not scenes:
            report[name] = "no scenes cover the area"
            continue
        with ThreadPoolExecutor(max_workers=8) as pool:
            res = [r for r in pool.map(read_scene, [(spec["bbox"], sc, spec["rows"], spec["cols"], spec["cell_px"]) for sc in scenes]) if r]
        merged = {}
        for d, arr in sorted(res, key=lambda r: r[0]):               # two tiles on the same day: fill one's gaps with the other
            merged[d] = arr if d not in merged else np.where(np.isfinite(merged[d]), merged[d], arr)
        dates = sorted(merged)
        np.savez_compressed(RAW / f"{name}{a.tag}.npz", dates=np.array(dates), ndvi=np.stack([merged[d] for d in dates]),
                            bbox=np.array(spec["bbox"]))
        report[name] = f"{len(dates)} dates read"
        print(f"  saved {name}{a.tag}: {report[name]}", flush=True)
    (RAW / f"fetch_report{a.tag}.json").write_text(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
