"""Leave-one-year-out backtest: does the rule separate dry seasons from ordinary ones, and how early does it catch 2026?

For every taluka sample box, every season Y and every "as of" date in the season:
  baseline = all OTHER seasons before 2026 (a season is never compared with itself),
  flag cells that are behind that baseline, record the share of visible farmland flagged.

Tuning (--tune) uses seasons other than 2026 only:
  "dry" seasons are those whose June-October rainfall is at most 80% of the median of the pre-2026 seasons (an independent weak label),
  the rule should flag more in dry seasons and little in ordinary ones. We pick the setting with the biggest gap
  between dry and ordinary seasons while false alarms in ordinary seasons stay at or under the target.
  2026 is then the test season: it was never used to choose anything.
Compares plain calendar-date baselines with crop-age-aligned baselines.
Outputs: ../validation/backtest.json
"""
import json
import sys
from pathlib import Path

import numpy as np

from analysis import (DEFAULT_TH, SEASON_START_DOY, aligned_normal, binned_by_year, crop_mask, flagged_share, level_series,
                      load_raw, normal_from, rain_total, sow_bins)
from config import TALUKAS

OUT = Path(__file__).resolve().parent.parent / "validation"
ASOF_BINS = list(range(5, 15))                       # 21 July to 28 October
ORDER_DOY = 268                                      # 25 September 2026, the state drought order
TEST_YEAR = 2026
FALSE_ALARM_TARGET = 0.10
DRY_FRACTION = 0.80
SWEEP = (-0.06, -0.08, -0.10, -0.12, -0.15, -0.18, -0.22, -0.26)


def bin_label(b):
    d = np.datetime64("2026-01-01") + int(SEASON_START_DOY + 10 * b - 1)
    return str(d)[5:]


def shares_for(by, mask, th, align):
    """{year: {bin: (flagged share, cannot-see share)}} with leave-one-year-out baselines."""
    years = sorted(by)
    pre = [y for y in years if y < TEST_YEAR]
    sow = sow_bins(by) if align else None
    out = {}
    for Y in years:
        base = [y for y in pre if y != Y]
        if len(base) < 2:
            continue
        normal, _ = aligned_normal(by, base, sow[Y], sow) if align else normal_from(by, base)
        dev = by[Y] - normal
        out[Y] = {b: flagged_share(level_series(dev, b, th), mask)[:2] for b in ASOF_BINS}
    return out


def baseline_levels(arr, last_bin, drop):
    """The simple rule: flag a cell when its latest clear reading is at least `drop` below its previous clear reading.
    No past seasons, no crop age. Same output coding as level_series (0 normal, 1 flagged, 3 cannot see)."""
    from analysis import STALE_BINS
    R, C = arr.shape[1:]
    lvl = np.full((R, C), 3, dtype=np.int8)
    for r in range(R):
        for c in range(C):
            idx = np.flatnonzero(np.isfinite(arr[: last_bin + 1, r, c]))
            if idx.size < 2 or last_bin - idx[-1] > STALE_BINS:
                continue
            lvl[r, c] = 1 if arr[idx[-1], r, c] - arr[idx[-2], r, c] <= -drop else 0
    return lvl


def baseline_shares(by, mask, drop):
    return {Y: {b: flagged_share(baseline_levels(by[Y], b, drop), mask)[:2] for b in ASOF_BINS} for Y in sorted(by)}


def detection_bin(res, margin=0.10, need=2):
    """First as-of bin from which 2026's flagged share beats every other season's by `margin`, `need` bins in a row."""
    others = [y for y in res if y != TEST_YEAR]
    run = 0
    for b in ASOF_BINS:
        t = res[TEST_YEAR][b][0]
        o = [res[y][b][0] for y in others if res[y][b][0] is not None]
        if t is not None and o and t > max(o) + margin:
            run += 1
            if run >= need:
                return b - need + 1
        else:
            run = 0
    return None


def dry_years(name, years):
    tot = {y: rain_total(name, y, 304) for y in years if y < TEST_YEAR}
    tot = {y: v for y, v in tot.items() if v is not None}
    if len(tot) < 3:
        return set()
    med = float(np.median(list(tot.values())))
    return {y for y, v in tot.items() if v <= DRY_FRACTION * med}


def main():
    tune = "--tune" in sys.argv
    data = {}
    for name in TALUKAS:
        try:
            dates, ndvi, _ = load_raw(name)
        except FileNotFoundError:
            continue
        data[name] = (binned_by_year(dates, ndvi), crop_mask(name))
    if not data:
        sys.exit("no data fetched yet")
    years_seen = sorted({y for by, _ in data.values() for y in by})
    print("seasons in data:", years_seen)
    dry = {n: dry_years(n, sorted(by)) for n, (by, _) in data.items()}
    print("dry seasons by rainfall:", {n: sorted(d) for n, d in dry.items()})

    def run(th, align):
        return {n: shares_for(by, m, th, align) for n, (by, m) in data.items()}

    def stats(r):
        late = ASOF_BINS[-5:]
        fa, dr, tst = [], [], []
        for n in r:
            for y in r[n]:
                vals = [r[n][y][b][0] for b in late if r[n][y][b][0] is not None]
                if not vals:
                    continue
                v = float(np.mean(vals))
                if y == TEST_YEAR:
                    tst.append(v)
                elif y in dry[n]:
                    dr.append(v)
                else:
                    fa.append(v)
        m = lambda x: round(float(np.mean(x)), 3) if x else None
        return {"false_alarm": m(fa), "dry_seasons": m(dr), "test_2026": m(tst), "n_ordinary": len(fa), "n_dry": len(dr)}

    th, align, sweep = dict(DEFAULT_TH), "--align" in sys.argv, []
    if tune:
        for al in (False, True):
            for w in SWEEP:
                t = {"watch": w, "urgent": w * 2, "urgent_prior": w}
                s = stats(run(t, al))
                s.update(aligned=al, watch=w, gap=None if s["dry_seasons"] is None or s["false_alarm"] is None else round(s["dry_seasons"] - s["false_alarm"], 3))
                sweep.append(s)
                print(s)
        ok = [s for s in sweep if s["false_alarm"] is not None and s["false_alarm"] <= FALSE_ALARM_TARGET and s["gap"] is not None]
        pick = max(ok, key=lambda s: s["gap"]) if ok else min(sweep, key=lambda s: s["false_alarm"] if s["false_alarm"] is not None else 9)
        th, align = {"watch": pick["watch"], "urgent": pick["watch"] * 2, "urgent_prior": pick["watch"]}, pick["aligned"]
        print("chosen on seasons other than 2026:", th, "aligned" if align else "calendar", "| test 2026 share:", pick["test_2026"])
        if "--freeze" in sys.argv:
            # The field sample was registered under certain settings. Keep them, so the website's labels stay the ones the field team tests.
            meta = json.loads((OUT / "field" / "sample_field_meta.json").read_text())
            frozen_th, frozen_align = meta["thresholds"], bool(meta["crop_age_aligned"])
            if (frozen_th, frozen_align) != (th, align):
                print(f"NOTE: tuning would now choose {th} aligned={align}, but the registered field sample used {frozen_th} aligned={frozen_align}. Keeping the registered settings.")
            th, align = frozen_th, frozen_align

    baseline = None
    if tune:
        late = ASOF_BINS[-5:]

        def base_stats(drop):
            r = {n: baseline_shares(by, m, drop) for n, (by, m) in data.items()}
            fa, dr, tst = [], [], []
            for n in r:
                for y in r[n]:
                    v = [r[n][y][b][0] for b in late if r[n][y][b][0] is not None]
                    if v:
                        (tst if y == TEST_YEAR else dr if y in dry[n] else fa).append(float(np.mean(v)))
            m = lambda x: round(float(np.mean(x)), 3) if x else None
            return r, {"drop": drop, "false_alarm": m(fa), "dry_seasons": m(dr), "test_2026": m(tst)}

        rows = []
        for drop in (0.04, 0.06, 0.08, 0.10, 0.13, 0.16, 0.20, 0.25, 0.30):
            r, s = base_stats(drop)
            rows.append((r, s))
            print("simple rule", s)
        ok = [x for x in rows if x[1]["false_alarm"] is not None and x[1]["false_alarm"] <= FALSE_ALARM_TARGET]
        r, s = ok[0] if ok else min(rows, key=lambda x: x[1]["false_alarm"] if x[1]["false_alarm"] is not None else 9)   # most sensitive setting within the target
        dets = {n: detection_bin(r[n]) for n in r if TEST_YEAR in r[n]}
        baseline = {**s, "rule": "flag a cell whose latest clear reading is at least `drop` below its previous clear reading",
                    "days_before_order": {n: (None if b is None else ORDER_DOY - (SEASON_START_DOY + 10 * b)) for n, b in dets.items()}}

    res = run(th, align)
    summary = {}
    for n, r in res.items():
        det = detection_bin(r) if TEST_YEAR in r else None
        summary[n] = {
            "detection_date": bin_label(det) if det is not None else None,
            "days_before_order": (ORDER_DOY - (SEASON_START_DOY + 10 * det)) if det is not None else None,
            "share_by_year_at_order": {str(y): (None if r[y][13][0] is None else round(r[y][13][0], 3)) for y in sorted(r)},
            "dry_seasons": sorted(dry[n]),
            "rain_to_order_mm": {str(y): rain_total(n, y, ORDER_DOY) for y in sorted(r)},
        }
    OUT.mkdir(exist_ok=True)
    payload = {"thresholds": th, "aligned": align, "seasons": years_seen, "per_taluka": summary, "sweep": sweep,
               "dry_definition": f"June-October rain at most {int(DRY_FRACTION * 100)}% of the median of pre-2026 seasons",
               "false_alarm_target": FALSE_ALARM_TARGET}
    if tune:
        payload["thresholds_tuned"] = th
        payload["frozen_to_field_registration"] = "--freeze" in sys.argv
        payload["simple_baseline"] = baseline
    (OUT / "backtest.json").write_text(json.dumps(payload, indent=1))
    print(json.dumps({n: {k: s[k] for k in ("detection_date", "days_before_order")} for n, s in summary.items()}))


if __name__ == "__main__":
    main()
