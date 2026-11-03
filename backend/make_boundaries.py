"""Cut Maharashtra out of the India boundary files and simplify it for the website.

Sources (open data, attribution required): geoBoundaries gbOpen India ADM1 (DataMeet, CC BY 2.5 IN)
and ADM2 (Pathways Data / LGD, ODbL). Output: ../frontend/public/maharashtra.json
"""
import json
import unicodedata
from pathlib import Path

from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "boundaries_src"
OUT = ROOT / "frontend" / "public" / "maharashtra.json"


def rnd(geom, nd=3):
    def r(c):
        return [round(c[0], nd), round(c[1], nd)] if isinstance(c[0], (int, float)) else [r(x) for x in c]
    g = mapping(geom)
    return {"type": g["type"], "coordinates": r(g["coordinates"])}


def main():
    s1 = json.loads((SRC / "adm1.geojson").read_text(encoding="utf-8"))
    plain = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").strip().lower()
    state = next(f for f in s1["features"] if plain(f["properties"]["shapeName"]) == "maharashtra")
    sg = shape(state["geometry"]).buffer(0)
    s2 = json.loads((SRC / "adm2.geojson").read_text(encoding="utf-8"))
    districts = []
    for f in s2["features"]:
        g = shape(f["geometry"]).buffer(0)
        if sg.contains(g.representative_point()):
            districts.append({"type": "Feature", "properties": {"name": f["properties"]["shapeName"]},
                              "geometry": rnd(g.simplify(0.004, preserve_topology=True))})
    out = {"state": {"type": "Feature", "properties": {"name": "Maharashtra"}, "geometry": rnd(sg.simplify(0.008))},
           "districts": {"type": "FeatureCollection", "features": districts},
           "credit": "Boundaries: geoBoundaries (DataMeet, CC BY 2.5 IN; Pathways Data / LGD, ODbL)"}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(len(districts), "districts;", OUT.stat().st_size // 1024, "KB")
    print(sorted(d["properties"]["name"] for d in districts))


if __name__ == "__main__":
    main()
