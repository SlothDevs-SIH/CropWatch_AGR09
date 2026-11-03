"""Leave-one-year-out backtest: does the rule separate the 2026 drought season from ordinary seasons, and how early?

For every taluka sample box, every season Y and every "as of" date in the season:
  baseline = all OTHER seasons before 2026 (so a season is never compared with itself),
  flag cells that are behind that baseline, and record the share of visible farmland flagged.
Thresholds are chosen using seasons other than 2026 only (false alarms in ordinary seasons), then 2026 is the test.
Outputs: ../validation/backtest.json and ../validation/BACKTEST.md
"""
import json
import sys
from pathlib import Path

import numpy as np

from analysis import (DEFAULT_TH, SEASON_START_DOY, binned_by_year, crop_mask, flagged_share, level_series, load_raw,
                      normal_from, rain_total)
from config import TALUKAS

OUT = Path(__file__).resolve().parent.parent / "validation"
ASOF_BINS = list(range(5, 15))                       # 21 July to 28 October
ORDER_DOY = 268                                      # 25 September 2026, the state drought order
TEST_YEAR = 2026
FALSE_ALARM_TARGET = 0.12


def bin_label(b):
    d = np.datetime64("2026-01-01") + int(SEASON_START_DOY + 10 * b - 1)
    return str(d)[5:]


def shares_for(by, mask, th):
    """{year: {bin: (flagged share, cannot-see share)}} with leave-one-year-out baselines."""
    years = sorted(by)
    pre = [y for y in years if y < TEST_YEAR]
    out = {}
    for Y in years:
        base = [y for y in pre if y != Y]
        if len([y for y in base if y in by]) < 2:
            continue
        normal, _ = normal_from(by, base)
        dev = by[Y] - normal
        out[Y] = {}
        for b in ASOF_BINS:
            share, cs, ns = flagged_share(level_series(dev, b, th), mask)
            out[Y][b] = (share, cs)
    return out


def detection_bin(res, margin=0.10, need=2):
    """First as-of bin from which the test year's share exceeds every other year's share by `margin`, for `need` bins in a row."""
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

    def run(th):
        return {n: shares_for(by, m, th) for n, (by, m) in data.items()}

    th = dict(DEFAULT_TH)
    sweep = []
    if tune:
        for w in (-0.06, -0.08, -0.10, -0.12, -0.15, -0.18, -0.22):
            t = {"watch": w, "urgent": w * 2, "urgent_prior": w}
            r = run(t)
            fa = [r[n][y][b][0] for n in r for y in r[n] if y != TEST_YEAR for b in ASOF_BINS[-5:] if r[n][y][b][0] is not None]
            tst = [r[n][TEST_YEAR][b][0] for n in r if TEST_YEAR in r[n] for b in ASOF_BINS[-5:] if r[n][TEST_YEAR][b][0] is not None]
            sweep.append({"watch": w, "false_alarm": round(float(np.mean(fa)), 3), "test_2026": round(float(np.mean(tst)), 3)})
            print(sweep[-1])
        ok = [s for s in sweep if s["false_alarm"] <= FALSE_ALARM_TARGET]
        pick = ok[0] if ok else min(sweep, key=lambda s: s["false_alarm"])   # least strict setting that meets the target
        th = {"watch": pick["watch"], "urgent": pick["watch"] * 2, "urgent_prior": pick["watch"]}
        print("chosen on seasons other than 2026:", th)

    res = run(th)
    summary = {}
    for n, r in res.items():
        det = detection_bin(r) if TEST_YEAR in r else None
        rain = {y: rain_total(n, y, ORDER_DOY) for y in sorted(r)}
        summary[n] = {
            "detection_date": bin_label(det) if det is not None else None,
            "days_before_order": (ORDER_DOY - (SEASON_START_DOY + 10 * det)) if det is not None else None,
            "share_by_year_at_order": {str(y): (None if r[y][13][0] is None else round(r[y][13][0], 3)) for y in sorted(r)},
            "rain_to_order_mm": {str(y): v for y, v in rain.items()},
        }
    OUT.mkdir(exist_ok=True)
    (OUT / "backtest.json").write_text(json.dumps({"thresholds": th, "sweep": sweep, "seasons": years_seen, "per_taluka": summary}, indent=1))
    print(json.dumps({n: {k: s[k] for k in ("detection_date", "days_before_order")} for n, s in summary.items()}))


if __name__ == "__main__":
    main()
