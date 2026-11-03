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
    "Mantha":      {"lat": 19.98, "lon": 76.50},
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
