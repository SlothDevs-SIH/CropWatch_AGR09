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

from config import GRID, TALUKAS

OUT = Path(__file__).resolve().parent.parent / "data" / "landcover"
BASE = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{t}_Map.tif"
PX = 400          # 10 m pixels across 4 km
CLASSES = {"tree": 10, "shrub": 20, "grass": 30, "crop": 40, "built": 50, "bare": 60, "water": 80}


def tile_for(lat, lon):
    return f"N{int(math.floor(lat / 3) * 3):02d}E{int(math.floor(lon / 3) * 3):03d}"


def main():
    from config import AREAS, area_spec, sample_spec
    OUT.mkdir(parents=True, exist_ok=True)
    for name in list(TALUKAS) + list(AREAS):
        spec = area_spec(name) if name in AREAS else sample_spec(name)
        bbox, rows, cols = spec["bbox"], spec["rows"], spec["cols"]
        n = spec["cell_m"] // 10                                    # WorldCover pixels (10 m) per cell side
        lat, lon = (bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2
        if tile_for(bbox[1], bbox[0]) != tile_for(bbox[3], bbox[2]):
            raise SystemExit(f"{name} crosses a WorldCover tile edge; split it before reading")
        with rasterio.open("/vsicurl/" + BASE.format(t=tile_for(lat, lon))) as src:
            a = src.read(1, window=from_bounds(*bbox, src.transform), out_shape=(rows * n, cols * n), resampling=Resampling.nearest)
        blocks = a.reshape(rows, n, cols, n).transpose(0, 2, 1, 3).reshape(rows, cols, n * n)
        nd = 3 if rows * cols > 1000 else 3
        share = {k: np.round((blocks == v).mean(-1), nd).tolist() for k, v in CLASSES.items()}
        (OUT / f"{name}.json").write_text(json.dumps({"source": "ESA WorldCover 2021 v200", "bbox": bbox, "share": share}, separators=(",", ":")))
        crop = np.array(share["crop"])
        print(f"{name}: cropland {crop.mean():.0%} of area, {(crop >= 0.5).sum()} of {rows * cols} cells at least half cropland")


if __name__ == "__main__":
    main()
