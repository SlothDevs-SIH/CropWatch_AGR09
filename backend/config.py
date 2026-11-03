"""Shared settings for the Crop Watch pilot: Jalna district, Maharashtra."""
import math

DISTRICT = {"id": "JALNA", "name": "Jalna", "state": "Maharashtra"}

# One 4 km sample box near each taluka town (approximate centres, to be replaced by real taluka outlines).
TALUKAS = {
    "Partur":      {"lat": 19.60, "lon": 76.21},
    "Jalna":       {"lat": 19.732, "lon": 75.985},   # moved from the town centre (18% cropland) to rural land (97%)
    "Badnapur":    {"lat": 19.87, "lon": 75.73},
    "Ambad":       {"lat": 19.61, "lon": 75.80},
    "Ghansawangi": {"lat": 19.42, "lon": 75.99},
    "Mantha":      {"lat": 19.715, "lon": 76.272},   # fixed: the earlier point was in Lonar, outside Jalna district
    "Jafrabad":    {"lat": 20.19, "lon": 76.03},
    "Bhokardan":   {"lat": 20.27, "lon": 75.77},
}
YEARS = [2023, 2024, 2025, 2026]
BASELINE_YEARS = [2023, 2024, 2025]
MONTHS = [6, 7, 8, 9, 10]
HALF_M = 2000.0   # half the box side, metres
GRID = 20         # 20 x 20 cells of 200 m


def box_for(lat, lon):
    """(west, south, east, north) of a 4 km square around a point."""
    dlat = HALF_M / 111320.0
    dlon = HALF_M / (111320.0 * math.cos(math.radians(lat)))
    return (lon - dlon, lat - dlat, lon + dlon, lat + dlat)


# ---------- whole-taluka areas (coarser cells, so a whole taluka is feasible) ----------
# The 4 km sample boxes above stay exactly as they are (the field sample refers to their cell ids).
AREAS = {"PartWhole": {"taluka": "Partur", "prefix": "PTW", "cell_m": 300, "px_m": 60}}


def sample_spec(name):
    """The 4 km sample box of a taluka as a grid spec."""
    t = TALUKAS[name]
    return {"taluka": name, "prefix": name[:3].upper(), "rows": GRID, "cols": GRID, "cell_m": 200, "px_m": 20, "cell_px": 10,
            "bbox": box_for(t["lat"], t["lon"]), "polygon": None, "kind": "sample_box"}


def area_spec(key):
    """A whole-taluka area: the taluka outline's bounding box cut into square cells, anchored at the north-west corner so cells tile exactly."""
    import json
    from pathlib import Path
    from shapely.geometry import shape
    a = AREAS[key]
    feats = json.loads((Path(__file__).resolve().parent.parent / "frontend" / "public" / "jalna_talukas.json").read_text())["features"]
    g = shape(next(f for f in feats if f["properties"].get("match") == a["taluka"])["geometry"]).buffer(0)
    w, s, e, n = g.bounds
    lat = (s + n) / 2
    dlat, dlon = a["cell_m"] / 111320.0, a["cell_m"] / (111320.0 * math.cos(math.radians(lat)))
    rows, cols = math.ceil((n - s) / dlat), math.ceil((e - w) / dlon)
    return {**a, "rows": rows, "cols": cols, "cell_px": a["cell_m"] // a["px_m"], "bbox": (w, n - rows * dlat, w + cols * dlon, n), "polygon": g, "kind": "whole_taluka"}
