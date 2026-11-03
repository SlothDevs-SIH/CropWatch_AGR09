"""Read ESA WorldCover 2021 (10 m land cover) for each sample box and keep the cropland share of every 200 m cell.

WorldCover classes: 10 tree, 20 shrub, 30 grass, 40 cropland, 50 built-up, 60 bare, 80 water.
Source: ESA WorldCover 2021 v200, open data (CC BY 4.0). Output: ../data/landcover/<taluka>.json
"""
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds

from config import GRID, TALUKAS, box_for

OUT = Path(__file__).resolve().parent.parent / "data" / "landcover"
BASE = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{t}_Map.tif"
PX = 400          # 10 m pixels across 4 km
CLASSES = {"tree": 10, "shrub": 20, "grass": 30, "crop": 40, "built": 50, "bare": 60, "water": 80}


def tile_for(lat, lon):
    return f"N{int(math.floor(lat / 3) * 3):02d}E{int(math.floor(lon / 3) * 3):03d}"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, t in TALUKAS.items():
        bbox = box_for(t["lat"], t["lon"])
        with rasterio.open("/vsicurl/" + BASE.format(t=tile_for(t["lat"], t["lon"]))) as src:
            a = src.read(1, window=from_bounds(*bbox, src.transform), out_shape=(PX, PX), resampling=Resampling.nearest)
        n = PX // GRID
        blocks = a.reshape(GRID, n, GRID, n).transpose(0, 2, 1, 3).reshape(GRID, GRID, n * n)
        share = {k: np.round((blocks == v).mean(-1), 3).tolist() for k, v in CLASSES.items()}
        (OUT / f"{name}.json").write_text(json.dumps({"source": "ESA WorldCover 2021 v200", "bbox": bbox, "share": share}, separators=(",", ":")))
        crop = np.array(share["crop"])
        print(f"{name}: cropland {crop.mean():.0%} of box, {(crop >= 0.5).sum()} of {GRID * GRID} cells at least half cropland")


if __name__ == "__main__":
    main()
