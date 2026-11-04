"""Cut the Jalna villages out of the open India village layer (geoBoundaries ADM5, Census 2011 boundaries, ODbL).

Needs the big file once:  data/boundaries_src/geoBoundaries-IND-ADM5_simplified.geojson  (about 467 MB, not kept in git)
  https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM5/geoBoundaries-IND-ADM5_simplified.geojson
Writes data/jalna_villages.geojson (small) and a copy for the website in frontend/public/jalna_villages.json.
Each village gets the taluka whose outline holds its centre.
"""
import json
import shutil
import sys
from pathlib import Path

import ijson
from shapely.geometry import Point, shape
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "boundaries_src" / "geoBoundaries-IND-ADM5_simplified.geojson"
OUT, SITE = ROOT / "data" / "jalna_villages.geojson", ROOT / "frontend" / "public" / "jalna_villages.json"

district = next(shape(f["geometry"]) for f in json.loads((ROOT / "data/boundaries_src/adm2.geojson").read_text())["features"] if f["properties"]["shapeName"] == "Jalna")
talukas = [(f["properties"]["match"], prep(shape(f["geometry"]))) for f in json.loads((ROOT / "frontend/public/jalna_talukas.json").read_text())["features"]]
pdistrict, (w, s, e, n) = prep(district), district.bounds


def round_coords(c):
    return [round(c[0], 5), round(c[1], 5)] if isinstance(c[0], float) else [round_coords(x) for x in c]


kept, seen = [], 0
with open(SRC, "rb") as f:
    for ft in ijson.items(f, "features.item", use_float=True):
        seen += 1
        g = ft["geometry"]
        ring = g["coordinates"][0] if g["type"] == "Polygon" else g["coordinates"][0][0]
        x, y = ring[0][0], ring[0][1]
        if not (w - 0.3 <= x <= e + 0.3 and s - 0.3 <= y <= n + 0.3):         # cheap test before building the shape
            continue
        geom = shape(g)
        c = geom.representative_point()
        if not pdistrict.contains(c):
            continue
        tal = next((name for name, p in talukas if p.contains(c)), None)
        kept.append({"type": "Feature", "properties": {"name": ft["properties"]["shapeName"], "id": ft["properties"]["shapeID"], "taluka": tal,
                                                       "ha": round(geom.area * (111_320 * 111_320 * 0.9435) / 10_000)},   # rough hectares at this latitude
                     "geometry": {"type": g["type"], "coordinates": round_coords(g["coordinates"])}})
fc = {"type": "FeatureCollection", "features": kept}
OUT.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
shutil.copyfile(OUT, SITE)
by = {}
for k in kept:
    by[k["properties"]["taluka"]] = by.get(k["properties"]["taluka"], 0) + 1
print(f"read {seen:,} villages, kept {len(kept)} in Jalna; by taluka: {by}; file {OUT.stat().st_size / 1e6:.1f} MB")
