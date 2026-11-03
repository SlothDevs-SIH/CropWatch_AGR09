"""Turn per-cell greenness into levels, reasons and a district ranking (method v2).

v2: baseline is every season before 2026 that was fetched; farmland comes from ESA WorldCover; rainfall context is added;
thresholds come from validation/backtest.json when the backtest has been run with --tune.
Handles the 4 km sample boxes and whole-taluka areas (config.AREAS) with the same code. Whole-taluka areas are clipped to the real
taluka outline and are kept out of the district ranking (the ranking compares like with like: one sample box per taluka).
Output: ../data/results/
"""
import json
from pathlib import Path

import numpy as np

from analysis import (DEFAULT_TH, NBINS, aligned_normal, bin_of, binned_by_year, crop_mask, doy, flagged_share, inside_mask, level_series,
                      load_raw, normal_from, rain_total, sow_bins)
from backtest import shares_for
from config import AREAS, DISTRICT, TALUKAS, area_spec, sample_spec

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


def cell_polygon(bbox, r, c, R, C):
    w, s, e, n = bbox
    dx, dy = (e - w) / C, (n - s) / R
    x0, y1 = w + c * dx, n - r * dy
    return [[round(x0, 6), round(y1, 6)], [round(x0 + dx, 6), round(y1, 6)], [round(x0 + dx, 6), round(y1 - dy, 6)],
            [round(x0, 6), round(y1 - dy, 6)], [round(x0, 6), round(y1, 6)]]


def build_one(name, spec, th, align):
    dates, ndvi, bbox = load_raw(name)
    by = binned_by_year(dates, ndvi)
    R, C = ndvi.shape[1:]
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
    inside = inside_mask(spec, R, C)
    mask = crop_mask(name)
    if mask is None:
        with np.errstate(all="ignore"):
            mask = np.nan_to_num(np.nanmax(normal, axis=0), nan=0) >= 0.35          # old shortcut, only if WorldCover is missing
    mask = mask & inside
    has_base = np.isfinite(normal).any(0)
    width = 3 if max(R, C) > 99 else 2
    feats, counts = [], {"normal": 0, "watch": 0, "urgent": 0, "cannot_see": 0, "not_farmland": 0}
    for r in range(R):
        for c in range(C):
            if not inside[r, c]:
                continue                                                            # outside the taluka: not drawn, not counted
            pid = f"{spec['prefix']}-r{r:0{width}d}c{c:0{width}d}"
            farm = bool(mask[r, c] and has_base[r, c])
            props = {"id": pid, "taluka": spec["taluka"], "area": name, "kind": spec["kind"], "row": r, "col": c, "farmland": farm}
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
                          "geometry": {"type": "Polygon", "coordinates": [cell_polygon(bbox, r, c, R, C)]}})
    farm_mask = mask & has_base
    share, cs, seen = flagged_share(lvl, farm_mask)
    farm_n = counts["normal"] + counts["watch"] + counts["urgent"] + counts["cannot_see"]
    upto = doy(last_date)
    rain_now = rain_total(spec["taluka"], TEST_YEAR, upto)
    past = [x for x in (rain_total(spec["taluka"], y, upto) for y in range(2018, TEST_YEAR)) if x is not None]
    usual = shares_for(by, farm_mask, th, align)                                    # every season against all the others, same date
    b_cmp = min(last_bin, max(usual[TEST_YEAR]))                                    # compare all seasons at the same date
    share_cmp = usual[TEST_YEAR][b_cmp][0]
    ord_shares = [usual[y][b_cmp][0] for y in usual if y != TEST_YEAR and usual[y][b_cmp][0] is not None]
    usual_med = round(float(np.median(ord_shares)), 3) if ord_shares else None
    usual_max = round(max(ord_shares), 3) if ord_shares else None
    summary = {"taluka": name, "parent_taluka": spec["taluka"], "kind": spec["kind"], "cell_m": spec["cell_m"], "rows": R, "cols": C,
               "as_of": last_date, "farmland_cells": farm_n, "visible_cells": seen, **counts,
               "stress_share": None if share is None else round(share, 3),
               "urgent_share": round(counts["urgent"] / seen, 3) if seen else None,
               "cannot_see_share": None if cs is None else round(cs, 3),
               "usual_share_median": usual_med, "usual_share_max": usual_max,
               "share_at_compare_date": None if share_cmp is None else round(share_cmp, 3),
               "excess_over_usual": None if share_cmp is None or usual_med is None else round(share_cmp - usual_med, 3),
               "exceeds_every_ordinary_season": bool(share_cmp is not None and usual_max is not None and share_cmp > usual_max),
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
    boxes, areas = [], []
    targets = [(n, sample_spec(n)) for n in TALUKAS] + [(k, area_spec(k)) for k in AREAS]
    for name, spec in targets:
        try:
            s = build_one(name, spec, th, align)
        except FileNotFoundError:
            print(name, "no data (skipped)")
            continue
        (boxes if spec["kind"] == "sample_box" else areas).append(s)
        print(name, {k: s[k] for k in ("farmland_cells", "visible_cells", "stress_share", "cannot_see_share", "excess_over_usual", "rain_pct_of_mean")})
    # The ranking compares like with like. Where a taluka has a whole-taluka area it ranks on that (the 4 km box overstated Partur by about 20 points);
    # otherwise it falls back to its sample box. The boxes stay in the file as a reference.
    whole = {a["parent_taluka"]: a for a in areas}
    pool = []
    for b in boxes:
        w = whole.get(b["parent_taluka"])
        if w:
            keep = ("stress_share", "share_at_compare_date", "excess_over_usual", "farmland_cells")
            pool.append({**w, "sample_box": {k: b[k] for k in keep}})
        else:
            pool.append(b)
    ranked = sorted(pool, key=lambda s: -(s["excess_over_usual"] if s["excess_over_usual"] is not None else (s["stress_share"] or 0)))   # most unusual for the date first
    for i, s in enumerate(ranked, 1):
        s["rank"] = i
        csh = s["cannot_see_share"]
        s["low_confidence"] = csh is None or csh > 0.5 or s["visible_cells"] < 30
    (OUT / "district.json").write_text(json.dumps({
        "district": DISTRICT, "talukas": ranked, "method": "v2", "thresholds": th, "thresholds_how": how, "crop_age_aligned": align,
        "sample_boxes": [{k: b[k] for k in ("taluka", "stress_share", "share_at_compare_date", "excess_over_usual", "farmland_cells")} for b in boxes],
        "ranked_by": "excess over the usual share of flagged farmland for this date (median of other seasons)",
        "note": "Talukas with a whole-taluka area are ranked on the whole taluka; the others on one 4 km sample box. Farmland is from ESA WorldCover. Percentages are not accuracy figures."}, indent=1))


if __name__ == "__main__":
    main()
