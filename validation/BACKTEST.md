# Backtest results (3 November 2026)

**What this tests.** Does the rule flag the 2026 drought season much more than ordinary seasons, does it beat a plain greenness-drop rule, and how early does it notice?
**Data.** Seven past seasons (2019 to 2025) plus 2026, eight 4 km sample boxes (one per Jalna taluka), 10-day bins June to October, farmland from ESA WorldCover. Reproduce with `backend/backtest.py --tune`. Raw output: `backtest.json`.

## How it was kept honest
- Every season is compared with **all the other** pre-2026 seasons, never with itself.
- Alert settings were chosen **without using 2026**. The target was at most 10% of visible farmland flagged in ordinary seasons. 2026 is the untouched test.
- "Ordinary" and "dry" seasons were told apart by June to October rainfall (dry means at most 80% of the median), an independent label.
- Past seasons were slid to the same **crop age** (when the crop first greens up) before comparing.

## Results

### 1. Does it separate 2026 from ordinary seasons? Yes, in 5 of 8 sample boxes
Share of visible farmland flagged at the order date (late September):

| Taluka box | 2026 | Ordinary seasons, median | Ordinary seasons, max |
|---|---|---|---|
| Partur | 69% | 7% | 20% |
| Jalna | 77% | 7% | 29% |
| Ambad | 46% | 1% | 4% |
| Badnapur | 40% | 8% | 17% |
| Mantha | 24% | 7% | 11% |
| Bhokardan | 28% | 18% | 31% (within the normal range) |
| Jafrabad | 8% | 17% | 21% (no signal) |
| Ghansawangi | 5% | 11% | 20% (no signal) |

Across all boxes, averaged over the last five dates: **26% flagged in 2026 against 8% in ordinary seasons** (45 taluka-seasons).

### 2. Does it beat the simple rule? Yes, clearly
The simple rule flags a cell when its latest clear reading is lower than the one before. Set to the same false-alarm rate (about 8% in ordinary seasons):

| | Ordinary seasons | 2026 |
|---|---|---|
| Our rule | 8% | **26%** |
| Simple rule | 8% | **5%** |

The simple rule flags 2026 **less** than ordinary seasons, so it cannot see this drought at all. Ours can.

### 3. How early? Not clearly before the order
Days between first detection and the 25 September order (positive means before):

| Partur | Jalna | Ambad | Mantha | Badnapur | Ghansawangi, Jafrabad, Bhokardan |
|---|---|---|---|---|---|
| +16 | +6 | -4 | -4 | -14 | no detection |

So the signal appears **around the order date**, a little earlier in two talukas and later in others. We do **not** claim an early warning of weeks. With satellite data alone and these sample boxes, what we can claim is that it **confirms and locates stress at about the time of the order**, plot by plot, which the order itself does not.

### 4. Did crop-age alignment help?
Barely. At the chosen setting both ways of comparing flag dry seasons slightly more than ordinary ones, and the aligned way has a slightly larger gap (about 1.1 points against 0.4). That is too small, on only 11 dry taluka-seasons, to call a proven benefit. We keep alignment because it is the principled comparison (a late-sown crop is not a stressed crop), not because it won clearly.

## Limits
- One 4 km box per taluka, not the whole taluka.
- Only eight seasons, and 2023 and 2025 are the only dry ones by rainfall in several boxes. The dry-season label is weak.
- Late-season shares are raised in every year by harvest timing, which is why the ranking now uses the excess over the usual share for the date.
- No farmer or field observations exist yet, so none of this is checked against the ground.
- The official list of declared Jalna talukas was not found, so there is no taluka-level match with it.
- Thresholds were chosen on the same eight boxes that are then tested (different seasons, same places). A test on new places is still missing.
