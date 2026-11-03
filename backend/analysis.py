"""Shared analysis: turn per-cell greenness readings into levels, for any year, against any set of baseline years.

Used by build_results.py (live results) and backtest.py (leave-one-year-out checks). Pure functions, no file writes.
"""
import json
from pathlib import Path

import numpy as np

from config import GRID

ROOT = Path(__file__).resolve().parent.parent
RAW, RAIN, LAND = ROOT / "data" / "raw", ROOT / "data" / "rain", ROOT / "data" / "landcover"
SEASON_START_DOY = 152            # 1 June
NBINS = 16                        # 10-day bins, June to early November
STALE_BINS = 3                    # a last clear reading older than this many bins means "cannot see"
MIN_BASELINE_YEARS = 2
CROP_MIN_SHARE = 0.5              # WorldCover cropland share needed for a cell to count as farmland
DEFAULT_TH = {"watch": -0.10, "urgent": -0.20, "urgent_prior": -0.10}


def doy(d: str) -> int:
    y, m, dd = map(int, d.split("-"))
    return int((np.datetime64(f"{y:04d}-{m:02d}-{dd:02d}") - np.datetime64(f"{y:04d}-01-01")).astype(int)) + 1


def bin_of(d: str) -> int:
    return (doy(d) - SEASON_START_DOY) // 10


def load_raw(name: str):
    """Merge the main file and the past-seasons file (if present) into one time-ordered stack."""
    parts = [RAW / f"{name}.npz"] + sorted(RAW.glob(f"{name}_*.npz"))      # the main file plus any past-seasons files
    dates, stacks, bbox = [], [], None
    for p in parts:
        if p.exists():
            z = np.load(p)
            dates += [str(d) for d in z["dates"]]
            stacks.append(z["ndvi"])
            bbox = [float(v) for v in z["bbox"]]
    if not stacks:
        raise FileNotFoundError(name)
    order = np.argsort(dates, kind="stable")
    return [dates[i] for i in order], np.concatenate(stacks)[order], bbox


def binned_by_year(dates, ndvi):
    """-> {year: array[NBINS, GRID, GRID]} of mean greenness per 10-day bin (NaN where no clear reading)."""
    out = {}
    for y in sorted({int(d[:4]) for d in dates}):
        arr = np.full((NBINS, GRID, GRID), np.nan, dtype=np.float32)
        for b in range(NBINS):
            idx = [i for i, d in enumerate(dates) if int(d[:4]) == y and bin_of(d) == b]
            if idx:
                with np.errstate(all="ignore"):
                    arr[b] = np.nanmean(ndvi[idx], axis=0)
        out[y] = arr
    return out


def normal_from(by, years):
    """Average greenness per bin over the baseline years, NaN where fewer than MIN_BASELINE_YEARS had a reading."""
    stack = np.stack([by[y] for y in years if y in by])
    n = np.isfinite(stack).sum(0)
    with np.errstate(all="ignore"):
        mean = np.nanmean(stack, axis=0)
    mean[n < MIN_BASELINE_YEARS] = np.nan
    return mean, n


def crop_mask(name):
    """Boolean [GRID, GRID]: cells at least half cropland by ESA WorldCover. Falls back to None if not fetched."""
    p = LAND / f"{name}.json"
    if not p.exists():
        return None
    return np.array(json.loads(p.read_text())["share"]["crop"]) >= CROP_MIN_SHARE


def level_series(dev, last_bin, th=DEFAULT_TH):
    """Vectorised levels for every cell. dev: [NBINS, R, C] (year minus normal).
    Returns int array [R, C]: 0 normal, 1 watch, 2 urgent, 3 cannot see (no usable reading near last_bin)."""
    fin = np.isfinite(dev[: last_bin + 1])
    R, C = dev.shape[1:]
    lvl = np.full((R, C), 3, dtype=np.int8)
    for r in range(R):
        for c in range(C):
            idx = np.flatnonzero(fin[:, r, c])
            if idx.size == 0 or last_bin - idx[-1] > STALE_BINS:
                continue
            last = dev[idx[-1], r, c]
            prior = dev[idx[-2], r, c] if idx.size > 1 else np.nan
            if last <= th["urgent"] and np.isfinite(prior) and prior <= th["urgent_prior"]:
                lvl[r, c] = 2
            elif last <= th["watch"]:
                lvl[r, c] = 1
            else:
                lvl[r, c] = 0
    return lvl


def flagged_share(lvl, mask):
    """Share of visible farmland cells that are Watch or Urgent, plus the share that could not be seen."""
    m = mask if mask is not None else np.ones_like(lvl, bool)
    farm = int(m.sum())
    if farm == 0:
        return None, None, 0
    seen = m & (lvl != 3)
    ns = int(seen.sum())
    share = float(((lvl == 1) | (lvl == 2))[seen].sum() / ns) if ns else None
    return share, 1 - ns / farm, ns


def rain_total(name, year, upto_doy):
    """Millimetres of rain from 1 June to the given day of year, or None when no rainfall file exists."""
    p = RAIN / f"{name}.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    return round(sum(v for k, v in d.items() if k.startswith(str(year)) and SEASON_START_DOY <= doy(k) <= upto_doy), 1)


# ---------- crop-age alignment ----------
GREEN_UP = 0.30     # greenness at which we say the crop has come up; the bin where a cell first reaches it marks its "sowing" stage


def sow_bins(by):
    """{year: float array [R, C]}: the (fractional) 10-day bin where each cell first rises through GREEN_UP. NaN if it never does."""
    out = {}
    for y, arr in by.items():
        sow = np.full(arr.shape[1:], np.nan, dtype=np.float32)
        for r in range(arr.shape[1]):
            for c in range(arr.shape[2]):
                v = arr[:, r, c]
                idx = np.flatnonzero(np.isfinite(v))
                for a, b in zip(idx[:-1], idx[1:]):
                    if v[a] < GREEN_UP <= v[b]:
                        sow[r, c] = a + (GREEN_UP - v[a]) / (v[b] - v[a]) * (b - a)
                        break
                else:
                    if idx.size and v[idx[0]] >= GREEN_UP:      # already above the line at the first reading
                        sow[r, c] = idx[0]
        out[y] = sow
    return out


def aligned_normal(by, base_years, target_sow, sow):
    """Like normal_from, but each past season is slid in time so its green-up lines up with the target season's
    green-up, cell by cell. That compares crops at the same age, not on the same calendar day.
    Cells whose green-up cannot be found (in either season) fall back to the plain calendar comparison."""
    R, C = target_sow.shape
    stack = []
    for y in base_years:
        if y not in by:
            continue
        arr = by[y].copy()
        shifted = np.full_like(arr, np.nan)
        for r in range(R):
            for c in range(C):
                s_t, s_y = target_sow[r, c], sow[y][r, c]
                k = int(round(s_t - s_y)) if np.isfinite(s_t) and np.isfinite(s_y) else 0
                k = max(-6, min(6, k))                      # never slide by more than 60 days
                col = arr[:, r, c]
                if k > 0:
                    shifted[k:, r, c] = col[:-k]
                elif k < 0:
                    shifted[:k, r, c] = col[-k:]
                else:
                    shifted[:, r, c] = col
        stack.append(shifted)
    st = np.stack(stack)
    n = np.isfinite(st).sum(0)
    with np.errstate(all="ignore"):
        mean = np.nanmean(st, axis=0)
    mean[n < MIN_BASELINE_YEARS] = np.nan
    return mean, n
