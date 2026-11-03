"""Checks on the analysis code itself, using small made-up arrays (no real data)."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from analysis import (DEFAULT_TH, GRID, NBINS, aligned_normal, bin_of, doy, flagged_share, level_series, normal_from, sow_bins)


def season(values, fill=np.nan):
    """A year array [NBINS, GRID, GRID] where every cell follows the same list of per-bin values."""
    a = np.full((NBINS, GRID, GRID), fill, dtype=np.float32)
    for b, v in enumerate(values):
        a[b] = v
    return a


CURVE = [0.1, 0.15, 0.3, 0.5, 0.7, 0.8, 0.8, 0.75, 0.7, 0.6, 0.45, 0.3, 0.2, 0.15, 0.1, 0.1]


def test_dates_fall_in_the_right_bins():
    assert doy("2026-06-01") == 152 and bin_of("2026-06-01") == 0
    assert bin_of("2026-09-25") == 11 and bin_of("2026-10-30") == 15


def test_normal_needs_two_past_years():
    by = {2024: season(CURVE), 2025: season(CURVE)}
    normal, n = normal_from(by, [2024, 2025])
    assert np.allclose(normal[:, 0, 0], CURVE) and int(n.min()) == 2
    one, _ = normal_from(by, [2024])
    assert np.isnan(one).all()                                     # a single past year is not a "normal"


def test_levels_follow_the_thresholds():
    dev = np.zeros((NBINS, GRID, GRID), dtype=np.float32)
    dev[9] = 0.0; dev[10] = 0.0
    dev[10, 0, 0] = -0.05                                          # barely behind: normal
    dev[10, 0, 1] = DEFAULT_TH["watch"] - 0.01                     # behind enough: watch
    dev[9, 0, 2] = DEFAULT_TH["urgent_prior"] - 0.01; dev[10, 0, 2] = DEFAULT_TH["urgent"] - 0.01   # behind twice, deeply: urgent
    dev[10, 0, 3] = DEFAULT_TH["urgent"] - 0.05; dev[9, 0, 3] = 0.0                                    # deep once only: watch, not urgent
    dev[:, 1, 0] = np.nan                                          # no readings at all
    lvl = level_series(dev, 10, DEFAULT_TH)
    assert [int(lvl[0, c]) for c in range(4)] == [0, 1, 2, 1]
    assert int(lvl[1, 0]) == 3                                     # no data is "cannot see", never "normal"


def test_stale_readings_become_cannot_see():
    dev = np.full((NBINS, GRID, GRID), np.nan, dtype=np.float32)
    dev[3] = -0.5                                                   # strongly behind, but only early in the season
    assert int(level_series(dev, 12, DEFAULT_TH)[0, 0]) == 3        # last reading is 9 bins old
    assert int(level_series(dev, 5, DEFAULT_TH)[0, 0]) in (1, 2)    # recent enough at bin 5


def test_flagged_share_counts_only_visible_farmland():
    lvl = np.zeros((GRID, GRID), dtype=np.int8)
    lvl[0, :10] = 1; lvl[0, 10:20] = 3                              # 10 flagged, 10 cannot see
    mask = np.zeros((GRID, GRID), bool); mask[0, :] = True; mask[5, :] = True   # row 5 is farmland and normal
    share, cannot, seen = flagged_share(lvl, mask)
    assert seen == 30 and round(share, 3) == round(10 / 30, 3) and round(cannot, 3) == round(10 / 40, 3)
    assert flagged_share(lvl, np.zeros((GRID, GRID), bool))[0] is None


def test_alignment_removes_a_pure_delay():
    """A crop sown 3 bins late follows the same curve, shifted. Against the calendar it looks far behind; aligned, it does not."""
    base = [season(CURVE), season(CURVE)]
    late = season([0.1] * 3 + CURVE[:-3])                           # same crop, three bins (30 days) later
    by = {2024: base[0], 2025: base[1], 2026: late}
    cal, _ = normal_from(by, [2024, 2025])
    sow = sow_bins(by)
    ali, _ = aligned_normal(by, [2024, 2025], sow[2026], sow)
    gap_cal = np.nanmax(np.abs((late - cal)[:, 0, 0]))
    gap_ali = np.nanmax(np.abs((late - ali)[3:12, 0, 0]))
    assert gap_cal > 0.3 and gap_ali < 0.12


def test_alignment_still_flags_a_real_shortfall():
    weak = season([v * 0.5 for v in CURVE])                         # sown on time, half as green all season
    by = {2024: season(CURVE), 2025: season(CURVE), 2026: weak}
    sow = sow_bins(by)
    ali, _ = aligned_normal(by, [2024, 2025], sow[2026], sow)
    dev = weak - ali
    assert float(np.nanmin(dev[:, 0, 0])) < -0.25                   # alignment must not hide genuine stress
