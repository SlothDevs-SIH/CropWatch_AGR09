"""Suggest better 4 km sample boxes: the spot near each taluka town with the most cropland (ESA WorldCover) and little built-up or water.

Run:  python suggest_boxes.py Jalna Ambad Mantha     (prints the three best centres for each, within 12 km of the town)
"""
import math
import sys

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

from config import HALF_M, TALUKAS
from fetch_landcover import BASE, tile_for

SPAN = 0.30          # degrees read around the town (about 33 km)
OUT_PX = 900         # about 37 m per pixel, plenty for a share estimate
SEARCH_KM = 12.0
STEP = 0.01          # candidate spacing in degrees (about 1.1 km)


def main():
    names = sys.argv[1:] or list(TALUKAS)
    for name in names:
        t = TALUKAS[name]
        lat0, lon0 = t["lat"], t["lon"]
        w, s, e, n = lon0 - SPAN / 2, lat0 - SPAN / 2, lon0 + SPAN / 2, lat0 + SPAN / 2
        with rasterio.open("/vsicurl/" + BASE.format(t=tile_for(lat0, lon0))) as src:
            a = src.read(1, window=from_bounds(w, s, e, n, src.transform), out_shape=(OUT_PX, OUT_PX), resampling=Resampling.nearest)
        px_lon, px_lat = SPAN / OUT_PX, SPAN / OUT_PX
        half_lat = HALF_M / 111320.0
        best = []
        for la in np.arange(lat0 - SEARCH_KM / 111.32, lat0 + SEARCH_KM / 111.32, STEP):
            half_lon = HALF_M / (111320.0 * math.cos(math.radians(la)))
            for lo in np.arange(lon0 - SEARCH_KM / (111.32 * math.cos(math.radians(la))), lon0 + SEARCH_KM / (111.32 * math.cos(math.radians(la))), STEP):
                r0, r1 = int((n - (la + half_lat)) / px_lat), int((n - (la - half_lat)) / px_lat)
                c0, c1 = int(((lo - half_lon) - w) / px_lon), int(((lo + half_lon) - w) / px_lon)
                if r0 < 0 or c0 < 0 or r1 > OUT_PX or c1 > OUT_PX:
                    continue
                box = a[r0:r1, c0:c1]
                crop, built, water = (box == 40).mean(), (box == 50).mean(), (box == 80).mean()
                if built < 0.05 and water < 0.03:
                    best.append((crop, la, lo, built))
        best.sort(reverse=True)
        top, seen = [], []
        for crop, la, lo, built in best:                    # keep candidates that are not on top of each other
            if all(abs(la - x) + abs(lo - y) > 0.05 for x, y in seen):
                top.append((crop, la, lo, built)); seen.append((la, lo))
            if len(top) == 3:
                break
        cur = TALUKAS[name]
        print(f"{name}: now ({cur['lat']}, {cur['lon']})")
        for crop, la, lo, built in top:
            print(f"   suggest lat={la:.3f} lon={lo:.3f}  cropland {crop:.0%}  built-up {built:.0%}")


if __name__ == "__main__":
    main()
