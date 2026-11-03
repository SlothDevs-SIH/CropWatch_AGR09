"""Turn the raw cell greenness into levels, reasons, and a district ranking.

Rules (provisional, not tuned yet, see docs): for each 200 m cell and each 10-day bin of the season,
compare 2026 with the average of 2023-2025 for the same bin. Output: ../data/results/
"""
import json
import math
from pathlib import Path

import numpy as np

from config import BASELINE_YEARS, DISTRICT, GRID, TALUKAS

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "data" / "raw", ROOT / "data" / "results"
SEASON_START_DOY = 152            # 1 June
NBINS = 16                        # 10-day bins, June to early November
FARMLAND_MIN_PEAK = 0.35          # a cell must reach this greenness in a normal year to count as farmland
WATCH, URGENT, URGENT_PRIOR = -0.10, -0.20, -0.10   # provisional thresholds (greenness points)
STALE_BINS = 3                    # last clear reading older than this many bins = "cannot see"
BIN_LABELS = [f"{(SEASON_START_DOY + 10 * b)}" for b in range(NBINS)]


def doy(d):
    y, m, dd = map(int, d.split("-"))
    return (np.datetime64(f"{y:04d}-{m:02d}-{dd:02d}") - np.datetime64(f"{y:04d}-01-01")).astype(int) + 1


def binned(dates, ndvi):
    """-> dict year -> array[NBINS, GRID, GRID] of mean NDVI (NaN where no clear reading)."""
    years = sorted({int(d[:4]) for d in dates})
    out = {}
    for y in years:
        arr = np.full((NBINS, GRID, GRID), np.nan, dtype=np.float32)
        for b in range(NBINS):
            idx = [i for i, d in enumerate(dates) if int(d[:4]) == y and (doy(d) - SEASON_START_DOY) // 10 == b]
            if idx:
                with np.errstate(all="ignore"):
                    arr[b] = np.nanmean(ndvi[idx], axis=0)
        out[y] = arr
    return out


def level_for(dev, valid_bins, last_bin):
    """dev: array over bins of 2026 minus normal. Returns (level, last_dev, prior_dev)."""
    if not valid_bins:
        return "cannot_see", None, None
    lb = valid_bins[-1]
    if last_bin - lb > STALE_BINS:
        return "cannot_see", float(dev[lb]), None
    last = float(dev[lb])
    prior = float(dev[valid_bins[-2]]) if len(valid_bins) > 1 else None
    if last <= URGENT and prior is not None and prior <= URGENT_PRIOR:
        return "urgent", last, prior
    if last <= WATCH:
        return "watch", last, prior
    return "normal", last, prior


def reason(level, last, valid_bins, dev):
    if level == "cannot_see":
        return "Too few clear satellite readings recently to judge this plot."
    below = sum(1 for b in valid_bins[-4:] if dev[b] <= WATCH)
    n = len(valid_bins[-4:])
    if level == "normal":
        return "Greenness is in line with the 2023 to 2025 average for this time of year."
    return (f"Greenness is {abs(last):.2f} points below the 2023 to 2025 average for this time of year, "
            f"and was behind normal in {below} of the last {n} clear readings.")


def cell_polygon(bbox, r, c):
    w, s, e, n = bbox
    dx, dy = (e - w) / GRID, (n - s) / GRID
    x0, y1 = w + c * dx, n - r * dy
    return [[x0, y1], [x0 + dx, y1], [x0 + dx, y1 - dy], [x0, y1 - dy], [x0, y1]]


def build_taluka(name):
    z = np.load(RAW / f"{name}.npz")
    dates, ndvi, bbox = [str(d) for d in z["dates"]], z["ndvi"], [float(v) for v in z["bbox"]]
    by = binned(dates, ndvi)
    base_stack = np.stack([by[y] for y in BASELINE_YEARS if y in by])      # [years, bins, R, C]
    n_base = np.isfinite(base_stack).sum(0)                                # years with data per bin
    with np.errstate(all="ignore"):
        normal = np.nanmean(base_stack, axis=0)
    normal[n_base < 2] = np.nan                                            # need at least 2 past years
    cur = by.get(2026, np.full_like(normal, np.nan))
    dev = cur - normal
    last_date = max(d for d in dates if d.startswith("2026"))
    last_bin = (doy(last_date) - SEASON_START_DOY) // 10
    with np.errstate(all="ignore"):
        peak = np.nanmax(normal, axis=0)
    feats, counts = [], {"normal": 0, "watch": 0, "urgent": 0, "cannot_see": 0, "not_farmland": 0}
    for r in range(GRID):
        for c in range(GRID):
            pid = f"{name[:3].upper()}-r{r:02d}c{c:02d}"
            is_farm = bool(np.isfinite(peak[r, c]) and peak[r, c] >= FARMLAND_MIN_PEAK)
            props = {"id": pid, "taluka": name, "row": r, "col": c, "farmland": is_farm}
            if not is_farm:
                props["level"] = "not_farmland"
                counts["not_farmland"] += 1
            else:
                d = dev[:, r, c]
                valid = [b for b in range(NBINS) if np.isfinite(d[b])]
                lvl, last, prior = level_for(d, valid, last_bin)
                recent = [b for b in valid if last_bin - b <= 6]
                conf = ("high" if len(recent) >= 4 and n_base[:, r, c].min() >= 2 else
                        "medium" if len(recent) >= 2 else "low")
                props.update(level=lvl, deviation=None if last is None else round(last, 3), confidence=conf,
                             reason=reason(lvl, last, valid, d),
                             series_2026=[None if not np.isfinite(v) else round(float(v), 3) for v in cur[:, r, c]],
                             series_normal=[None if not np.isfinite(v) else round(float(v), 3) for v in normal[:, r, c]])
                counts[lvl] += 1
            feats.append({"type": "Feature", "properties": props,
                          "geometry": {"type": "Polygon", "coordinates": [cell_polygon(bbox, r, c)]}})
    seen = counts["normal"] + counts["watch"] + counts["urgent"]
    farm = seen + counts["cannot_see"]
    summary = {"taluka": name, "as_of": last_date, "farmland_cells": farm, "visible_cells": seen, **counts,
               "stress_share": round((counts["watch"] + counts["urgent"]) / seen, 3) if seen else None,
               "urgent_share": round(counts["urgent"] / seen, 3) if seen else None,
               "cannot_see_share": round(counts["cannot_see"] / farm, 3) if farm else None,
               "scenes_used": len(dates), "bbox": bbox, "centre": [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]}
    geo = {"type": "FeatureCollection", "properties": summary, "features": feats}
    (OUT / f"taluka_{name}.geojson").write_text(json.dumps(geo, separators=(",", ":")))
    return summary


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sums = []
    for name in TALUKAS:
        if (RAW / f"{name}.npz").exists():
            s = build_taluka(name)
            sums.append(s)
            print(name, {k: s[k] for k in ("farmland_cells", "visible_cells", "stress_share", "urgent_share", "cannot_see_share")})
        else:
            print(name, "no data (skipped)")
    ranked = sorted(sums, key=lambda s: (-(s["stress_share"] or 0)))
    for i, s in enumerate(ranked, 1):
        s["rank"] = i
        csh = s["cannot_see_share"]
        s["low_confidence"] = csh is None or csh > 0.5 or s["visible_cells"] < 30
    (OUT / "district.json").write_text(json.dumps({"district": DISTRICT, "talukas": ranked,
        "note": "Each taluka is represented by one 4 km sample box. Thresholds are provisional."}, indent=1))


if __name__ == "__main__":
    main()
