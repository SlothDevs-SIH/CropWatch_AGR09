"""Visibility test: is crop stress in 2026 visible against 2023-2025 at candidate sites?

For each site, reads a small box from every Sentinel-2 scene June-October, 2023-2026,
and writes the median greenness (NDVI) of clear pixels plus how much was clear.
Output: ../validation/visibility_raw.csv
"""
import csv
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

sys.path.insert(0, r"C:\Soham\college work\fusion_hack\GEOAI_04_SLOTHDEV")
from engine import s2  # noqa: E402  (our own tested scene search and bucket reader)

SITES = {
    # name: (region, lat, lon)
    "Latur":      ("Marathwada", 18.40, 76.58),
    "Beed":       ("Marathwada", 18.99, 75.76),
    "Jalna":      ("Marathwada", 19.60, 76.21),
    "Dharashiv":  ("Marathwada", 18.18, 76.04),
    "Mangaon":    ("Konkan",     18.23, 73.27),
    "Chiplun":    ("Konkan",     17.53, 73.52),
    "Wada":       ("Konkan",     19.65, 73.13),
}
YEARS = [2023, 2024, 2025, 2026]
MONTHS = [6, 7, 8, 9, 10]
HALF = 0.018  # about 2 km each way -> 4 km box
CLEAR = [4, 5]  # SCL: vegetation, bare soil
OUT = Path(r"C:\Soham\college work\CropWatch\validation\visibility_raw.csv")


def measure(args):
    site, region, bbox, sc = args
    try:
        with s2._open(sc.href("B04")) as ref:
            b = transform_bounds("EPSG:4326", ref.crs, *bbox)
            win = from_bounds(*b, ref.transform).round_offsets().round_lengths()
            shape = (max(int(win.height) // 2, 8), max(int(win.width) // 2, 8))  # 20 m is plenty for a median

            def rd(band, rs):
                with s2._open(sc.href(band)) as s:
                    return s.read(1, window=from_bounds(*b, s.transform), out_shape=shape,
                                  resampling=rs, boundless=True, fill_value=0).astype(np.float32)
            red, nir = rd("B04", Resampling.bilinear), rd("B08", Resampling.bilinear)
            scl = rd("SCL", Resampling.nearest)
        off = s2.detect_offset(sc.baseline, red)
        red, nir = (red - off) / 10000.0, (nir - off) / 10000.0
        ok = np.isin(scl, CLEAR) & (red + nir > 0)
        if ok.sum() < 20:
            return [site, region, sc.date.isoformat(), "", round(float(ok.mean()), 3), sc.cloud_pct]
        ndvi = (nir[ok] - red[ok]) / (nir[ok] + red[ok])
        return [site, region, sc.date.isoformat(), round(float(np.median(ndvi)), 4),
                round(float(ok.mean()), 3), sc.cloud_pct]
    except Exception as e:  # keep going; a failed scene is logged as empty
        return [site, region, sc.date.isoformat(), "", "", f"ERR {type(e).__name__}"]


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:] or list(SITES)
    rows = []
    for site in only:
        region, lat, lon = SITES[site]
        bbox = (lon - HALF, lat - HALF, lon + HALF, lat + HALF)
        tile = s2.mgrs_tile(lat, lon)
        months = [(y, m) for y in YEARS for m in MONTHS]
        scenes = s2.search(tile, months, max_cloud=100.0, bbox_ll=bbox)
        print(f"{site} ({region}) tile {tile}: {len(scenes)} scenes", flush=True)
        with ThreadPoolExecutor(max_workers=8) as pool:
            res = list(pool.map(measure, [(site, region, bbox, sc) for sc in scenes]))
        rows += res
        print(f"  done {site}", flush=True)
        with open(OUT, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["site", "region", "date", "ndvi", "clear_fraction", "tile_cloud"])
            w.writerows(rows)


if __name__ == "__main__":
    main()
