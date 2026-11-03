"""Turn per-cell greenness into levels, reasons and a district ranking (method v2).

v2 changes: baseline is every season 2019 to 2025 that was fetched (not just three),
farmland comes from ESA WorldCover (not a greenness shortcut), rainfall context is added,
and thresholds come from validation/backtest.json when the backtest has been run with --tune.
Output: ../data/results/
"""
import json
from pathlib import Path

import numpy as np

from analysis import (DEFAULT_TH, NBINS, aligned_normal, bin_of, binned_by_year, crop_mask, doy, flagged_share, level_series,
                      load_raw, normal_from, rain_total, sow_bins)
from config import DISTRICT, GRID, TALUKAS

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "results"
TEST_YEAR = 2026
NAMES = {0: "normal", 1: "watch", 2: "urgent", 3: "cannot_see"}


def thresholds():
    """(thresholds, description, crop-age aligned?) from the last tuned backtest, else the untuned defaults."""
    p = ROOT / "validation" / "backtest.json"
    if p.exists():
        d = json.loads(p.read_text())
        if d.get("thresholds_tuned"):
            return d["thresholds_tuned"], "tuned on seasons other than 2026", bool(d.get("aligned"))
    return dict(DEFAULT_TH), "default (not tuned)", False


def reason(level, last, valid, dev, th):
    if level == "cannot_see":
        return "Too few clear satellite readings recently to judge this plot."
    if level == "normal":
        return "Greenness is in line with the average of past seasons for this time of year."
    recent = valid[-4:]
    below = sum(1 for b in recent if dev[b] <= th["watch"])
    return (f"Greenness is {abs(last):.2f} points below the average of past seasons for this time of year, "
            f"and was behind normal in {below} of the last {len(recent)} clear readings.")


def cell_polygon(bbox, r, c):
    w, s, e, n = bbox
    dx, dy = (e - w) / GRID, (n - s) / GRID
    x0, y1 = w + c * dx, n - r * dy
    return [[x0, y1], [x0 + dx, y1], [x0 + dx, y1 - dy], [x0, y1 - dy], [x0, y1]]


def build_taluka(name, th, align):
    dates, ndvi, bbox = load_raw(name)
    by = binned_by_year(dates, ndvi)
    base_years = [y for y in sorted(by) if y < TEST_YEAR]
    if align:
        sow = sow_bins(by)
        normal, n_base = aligned_normal(by, base_years, sow[TEST_YEAR], sow)       # past seasons slid to the same crop age
    else:
        normal, n_base = normal_from(by, base_years)
    cur = by[TEST_YEAR]
    dev = cur - normal
    last_date = max(d for d in dates if d.startswith(str(TEST_YEAR)))
    last_bin = bin_of(last_date)
    lvl = level_series(dev, last_bin, th)
    mask = crop_mask(name)
    if mask is None:
        with np.errstate(all="ignore"):
            mask = np.nan_to_num(np.nanmax(normal, axis=0), nan=0) >= 0.35          # old shortcut, only if WorldCover is missing
    has_base = np.isfinite(normal).any(0)
    feats, counts = [], {"normal": 0, "watch": 0, "urgent": 0, "cannot_see": 0, "not_farmland": 0}
    for r in range(GRID):
        for c in range(GRID):
            pid = f"{name[:3].upper()}-r{r:02d}c{c:02d}"
            farm = bool(mask[r, c] and has_base[r, c])
            props = {"id": pid, "taluka": name, "row": r, "col": c, "farmland": farm}
            if not farm:
                props["level"] = "not_farmland"
                counts["not_farmland"] += 1
            else:
                d = dev[:, r, c]
                valid = [b for b in range(NBINS) if np.isfinite(d[b]) and b <= last_bin]
                level = NAMES[int(lvl[r, c])]
                last = float(d[valid[-1]]) if valid else None
                recent = [b for b in valid if last_bin - b <= 6]
                conf = ("high" if len(recent) >= 4 and n_base[recent].min() >= 4 else "medium" if len(recent) >= 2 else "low")
                props.update(level=level, deviation=None if last is None else round(last, 3), confidence=conf,
                             reason=reason(level, last, valid, d, th),
                             series_2026=[None if not np.isfinite(v) else round(float(v), 3) for v in cur[:, r, c]],
                             series_normal=[None if not np.isfinite(v) else round(float(v), 3) for v in normal[:, r, c]])
                counts[level] += 1
            feats.append({"type": "Feature", "properties": props,
                          "geometry": {"type": "Polygon", "coordinates": [cell_polygon(bbox, r, c)]}})
    share, cs, seen = flagged_share(lvl, mask & has_base)
    farm_n = counts["normal"] + counts["watch"] + counts["urgent"] + counts["cannot_see"]
    upto = doy(last_date)
    rain_now = rain_total(name, TEST_YEAR, upto)
    past = [r for r in (rain_total(name, y, upto) for y in range(2018, TEST_YEAR)) if r is not None]
    summary = {"taluka": name, "as_of": last_date, "farmland_cells": farm_n, "visible_cells": seen, **counts,
               "stress_share": None if share is None else round(share, 3),
               "urgent_share": round(counts["urgent"] / seen, 3) if seen else None,
               "cannot_see_share": None if cs is None else round(cs, 3),
               "baseline_years": base_years, "scenes_used": len(dates), "bbox": bbox,
               "centre": [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
               "rain_mm": rain_now, "rain_mean_prev_mm": round(sum(past) / len(past), 1) if past else None,
               "rain_pct_of_mean": round(100 * rain_now / (sum(past) / len(past))) if past and rain_now is not None else None}
    geo = {"type": "FeatureCollection", "properties": summary, "features": feats}
    (OUT / f"taluka_{name}.geojson").write_text(json.dumps(geo, separators=(",", ":")))
    return summary


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    th, how, align = thresholds()
    print("thresholds:", th, "-", how, "| crop-age aligned:", align)
    sums = []
    for name in TALUKAS:
        try:
            s = build_taluka(name, th, align)
        except FileNotFoundError:
            print(name, "no data (skipped)")
            continue
        sums.append(s)
        print(name, {k: s[k] for k in ("farmland_cells", "visible_cells", "stress_share", "urgent_share", "cannot_see_share", "rain_pct_of_mean")})
    ranked = sorted(sums, key=lambda s: -(s["stress_share"] or 0))
    for i, s in enumerate(ranked, 1):
        s["rank"] = i
        csh = s["cannot_see_share"]
        s["low_confidence"] = csh is None or csh > 0.5 or s["visible_cells"] < 30
    (OUT / "district.json").write_text(json.dumps({
        "district": DISTRICT, "talukas": ranked, "method": "v2", "thresholds": th, "thresholds_how": how, "crop_age_aligned": align,
        "note": "Each taluka is represented by one 4 km sample box. Farmland is from ESA WorldCover. Percentages are not accuracy figures."}, indent=1))


if __name__ == "__main__":
    main()
