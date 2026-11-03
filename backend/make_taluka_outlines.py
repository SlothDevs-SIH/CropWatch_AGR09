"""Cut the eight Jalna talukas out of the India sub-district file and measure how much of each our sample box covers.

Source: geoBoundaries gbOpen India ADM3 (sub-district), from the Local Government Directory via Pathways Data, ODbL, 2018 boundaries.
Outputs: ../frontend/public/jalna_talukas.json (simplified outlines) and ../data/coverage.json (areas and coverage, real numbers).
"""
import json
import math
import unicodedata
from pathlib import Path

from shapely.geometry import box, mapping, shape

from config import TALUKAS, box_for

ROOT = Path(__file__).resolve().parent.parent
plain = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").strip().lower()


def km2(geom):
    lat = geom.centroid.y
    return geom.area * (111.32 ** 2) * math.cos(math.radians(lat))      # small-area approximation, good to a few percent


def main():
    mh = json.loads((ROOT / "frontend" / "public" / "maharashtra.json").read_text())
    jalna = shape(next(f for f in mh["districts"]["features"] if f["properties"]["name"] == "Jalna")["geometry"]).buffer(0)
    s3 = json.loads((ROOT / "data" / "boundaries_src" / "adm3.geojson").read_text(encoding="utf-8"))
    inside = []
    for f in s3["features"]:
        g = shape(f["geometry"]).buffer(0)
        if jalna.contains(g.representative_point()):
            inside.append((f["properties"]["shapeName"], g))
    print("sub-districts inside Jalna:", [n for n, _ in inside])
    out, cov = [], {}
    want = {plain(k): k for k in TALUKAS}
    for name, g in inside:
        key = want.get({"jafferabad": "jafrabad"}.get(plain(name.split("(")[0]), plain(name.split("(")[0])))   # the file spells Jafrabad as Jafferabad
        out.append({"type": "Feature", "properties": {"name": name, "match": key}, "geometry": mapping(g.simplify(0.003, preserve_topology=True))})
    for tname, t in TALUKAS.items():
        b = box(*box_for(t["lat"], t["lon"]))
        owner = next(((n, g) for n, g in inside if g.contains(b.centroid)), None)
        if owner is None:
            cov[tname] = {"box_inside_any_taluka": False}
            continue
        n, g = owner
        cov[tname] = {"outline_name": n, "taluka_area_km2": round(km2(g)), "box_km2": round(km2(b), 1), "box_share_of_taluka_pct": round(100 * km2(b) / km2(g), 2),
                      "box_fully_inside": bool(g.contains(b)), "box_inside_its_own_taluka": {"jafferabad": "jafrabad"}.get(plain(n.split("(")[0]), plain(n.split("(")[0])) == plain(tname)}   # the file spells Jafrabad as Jafferabad
        print(tname, cov[tname])
    (ROOT / "frontend" / "public" / "jalna_talukas.json").write_text(json.dumps({"type": "FeatureCollection", "features": out, "credit": "geoBoundaries ADM3 (LGD via Pathways Data, ODbL)"}, separators=(",", ":")))
    tot_area = sum(v.get("taluka_area_km2", 0) for v in cov.values())
    (ROOT / "data" / "coverage.json").write_text(json.dumps({"per_taluka": cov, "district_area_km2_from_outlines": round(sum(km2(g) for _, g in inside)),
                                                           "sample_area_km2": sum(v.get("box_km2", 0) for v in cov.values())}, indent=1))
    print("district area from taluka outlines: %d km2; sample area %.0f km2" % (sum(km2(g) for _, g in inside), sum(v.get("box_km2", 0) for v in cov.values())))


if __name__ == "__main__":
    main()
