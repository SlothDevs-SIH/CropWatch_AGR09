"""Draw a blind, reproducible field sample for one taluka.

Why blind: the people visiting plots must not know which ones Crop Watch flagged, or they will see what they expect.
They get cell ids and GPS points only. The labels go into a separate KEY file that stays sealed until the visits are done.
A SHA-256 of the key is written into the (committed) meta file now, so nobody can change the labels afterwards.

  python make_field_sample.py Partur Ambad Ghansawangi --per-group 20 --reserve 6 --seed 20261104

Outputs in ../validation/field/ :
  sample_field.csv / .geojson      what the field team gets (no labels, shuffled)
  sample_field_meta.json           seed, counts, settings, and the hash of the sealed key (commit this)
  sample_field_KEY_SEALED.csv      labels and our first-flag dates (do NOT commit or open before the visits)
"""
import argparse
import csv
import hashlib
import json
import random
from datetime import date
from pathlib import Path

import numpy as np

from analysis import aligned_normal, bin_of, binned_by_year, level_series, load_raw, normal_from, sow_bins, SEASON_START_DOY
from build_results import thresholds

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "validation" / "field"
ASOF_BINS = list(range(5, 15))
FLAGGED, UNFLAGGED = ("urgent", "watch"), ("normal",)


def centre(feature):
    ring = feature["geometry"]["coordinates"][0]
    return (ring[0][0] + ring[2][0]) / 2, (ring[0][1] + ring[2][1]) / 2


def first_flag_dates(name, th, align):
    """For every cell, the first 10-day bin (as a date) at which it would have been flagged this season. None if never."""
    dates, ndvi, _ = load_raw(name)
    by = binned_by_year(dates, ndvi)
    base = [y for y in sorted(by) if y < 2026]
    if align:
        sow = sow_bins(by)
        normal, _ = aligned_normal(by, base, sow[2026], sow)
    else:
        normal, _ = normal_from(by, base)
    dev = by[2026] - normal
    first = {}
    for b in ASOF_BINS:
        lvl = level_series(dev, b, th)
        for r in range(lvl.shape[0]):
            for c in range(lvl.shape[1]):
                if lvl[r, c] in (1, 2) and (r, c) not in first:
                    first[(r, c)] = str(np.datetime64("2026-01-01") + int(SEASON_START_DOY + 10 * b - 1))
    return first


def pick_balanced(pools, n, gap, takens, rng):
    """Take cells round-robin across talukas so no single 4 km box dominates. Within a taluka, cells are at least `gap`
    cells (Chebyshev distance) apart, so neighbouring plots, which are not independent, are not both sampled."""
    order = {t: rng.sample(p, len(p)) for t, p in pools.items()}
    chosen, idx = [], {t: 0 for t in pools}
    while len(chosen) < n and any(idx[t] < len(order[t]) for t in pools):
        for t in pools:
            while idx[t] < len(order[t]):
                f = order[t][idx[t]]; idx[t] += 1
                r, c = f["properties"]["row"], f["properties"]["col"]
                if all(max(abs(r - r2), abs(c - c2)) >= gap for r2, c2 in takens[t]):
                    chosen.append(f); takens[t].append((r, c))
                    break
            if len(chosen) == n:
                break
    return chosen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("talukas", nargs="*", default=["Partur", "Ambad", "Ghansawangi"])
    ap.add_argument("--per-group", type=int, default=20)
    ap.add_argument("--reserve", type=int, default=6, help="spare cells per group, used in order if a plot cannot be visited")
    ap.add_argument("--seed", type=int, default=20261104)
    ap.add_argument("--gap", type=int, default=3, help="minimum distance between sampled cells in one taluka, in cells (3 = 600 m)")
    a = ap.parse_args()

    geos, pool_f, pool_u = {}, {}, {}
    for t in a.talukas:
        geos[t] = json.loads((ROOT / "data" / "results" / f"taluka_{t}.geojson").read_text())
        farm = [f for f in geos[t]["features"] if f["properties"]["farmland"]]
        pool_f[t] = [f for f in farm if f["properties"]["level"] in FLAGGED]
        pool_u[t] = [f for f in farm if f["properties"]["level"] in UNFLAGGED]
    need = a.per_group + a.reserve
    gap = a.gap
    while True:
        takens = {t: [] for t in a.talukas}
        rng = random.Random(a.seed)
        fl, un = pick_balanced(pool_f, need, gap, takens, rng), pick_balanced(pool_u, need, gap, takens, rng)
        if (len(fl) == need and len(un) == need) or gap == 1:
            break
        gap -= 1                                                    # not enough well-spaced cells: loosen the spacing and say so
    if len(fl) < need or len(un) < need:
        raise SystemExit(f"only {len(fl)} flagged and {len(un)} unflagged cells available, need {need} each")

    th, how, align = thresholds()
    first = {t: first_flag_dates(t, th, align) for t in a.talukas}
    rows = []
    for group, cells in (("flagged", fl), ("unflagged", un)):
        for i, f in enumerate(cells):
            p = f["properties"]
            lon, lat = centre(f)
            rows.append({"cell_id": p["id"], "role": "primary" if i < a.per_group else "reserve", "reserve_rank": max(0, i - a.per_group + 1),
                         "group": group, "lat": round(lat, 6), "lon": round(lon, 6), "level": p["level"], "deviation": p.get("deviation"),
                         "first_flag_date": first[p["taluka"]].get((p["row"], p["col"])), "as_of": geos[p["taluka"]]["properties"]["as_of"], "taluka": p["taluka"]})
    shuffled = rows[:]
    random.Random(a.seed + 1).shuffle(shuffled)                   # the visiting order carries no information about the label
    OUT.mkdir(parents=True, exist_ok=True)
    blind = [{"visit_order": i + 1, "taluka": r["taluka"], "cell_id": r["cell_id"], "role": r["role"], "reserve_note": "use only if an earlier plot cannot be visited" if r["role"] == "reserve" else "",
              "lat": r["lat"], "lon": r["lon"], "cell_size_m": 200, "maps_link": f"https://www.google.com/maps?q={r['lat']},{r['lon']}"} for i, r in enumerate(shuffled)]
    with open(OUT / "sample_field.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(blind[0])); w.writeheader(); w.writerows(blind)
    gj = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {k: b[k] for k in ("visit_order", "taluka", "cell_id", "role")}, "geometry": {"type": "Point", "coordinates": [b["lon"], b["lat"]]}} for b in blind]}
    (OUT / "sample_field.geojson").write_text(json.dumps(gj))
    key_path = OUT / "sample_field_KEY_SEALED.csv"
    with open(key_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["cell_id", "taluka", "role", "reserve_rank", "group", "level", "deviation", "first_flag_date", "as_of", "lat", "lon"])
        w.writeheader(); w.writerows([{k: r[k] for k in w.fieldnames} for r in rows])
    meta = {"talukas": a.talukas, "created": date.today().isoformat(), "seed": a.seed, "per_group": a.per_group, "reserve_per_group": a.reserve,
            "min_gap_cells": gap, "thresholds": th, "thresholds_how": how, "crop_age_aligned": align,
            "pool_flagged": {t: len(v) for t, v in pool_f.items()}, "pool_unflagged": {t: len(v) for t, v in pool_u.items()},
            "per_taluka_primary": {t: sum(1 for r in rows if r["taluka"] == t and r["role"] == "primary") for t in a.talukas}, "key_sha256": hashlib.sha256(key_path.read_bytes()).hexdigest(),
            "note": "The key file holds the labels and must stay sealed until the visits are done. Its hash is recorded here so it cannot be changed afterwards."}
    (OUT / "sample_field_meta.json").write_text(json.dumps(meta, indent=1))
    print(f"{a.talukas}: {len(fl)} flagged + {len(un)} unflagged (incl. {a.reserve} reserve each), spacing {gap} cells; key hash {meta['key_sha256'][:16]}...")


if __name__ == "__main__":
    main()
