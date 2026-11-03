# Crop Watch: Progress Report (updated 4 November 2026, rubric added and Mantha corrected)

**How to read the percentages.** They are my estimates, not measurements. A percentage means: how much of what we planned for a demo we could defend in front of a jury is built and tested.

## Overall

| Area | Done | Change |
|---|---|---|
| Backend | **about 80%** | Was 72%. Production hardening, tests on the analysis, any-size areas, **whole Partur taluka covered** |
| Data | **about 49%** | Was 55% before recalibration, 42% after it, now up with whole-Partur. The old figure counted having some of each ingredient, not how much of the district we cover (see below) |
| Frontend | about 55% | Unchanged. Farmer view, evidence-pack screen, Marathi, offline not built |
| Validation | about 56% | Was 52%. Backtest corrected for Mantha; **whole-taluka check done**; still no ground observations |
| **Whole project** | **about 62%** | Was 60%. Data was recalibrated down, then real work moved it up |

Commits: 129 on `main`. Tests: 29 passing.

## Why backend is about 77% and data about 42%, not higher

**These are estimates from a written rubric, so you can argue with the weights.** Each row is a piece of what we planned, its weight, and how complete it is.

### Backend

| Piece | Weight | Done | What is still missing |
|---|---|---|---|
| Data pipeline (fetch, farmland mask, rainfall) | 20% | 88% | Radar gap-fill. Rainfall is coarse (about 50 km) |
| Analysis logic (levels, crop-age alignment, tuning, simple-rule comparison) | 20% | 80% | A test on **new places**; persistence rules. Checked on a whole taluka (Partur) only |
| Web service features (roles, checks, photos, evidence pack, orders, admin users, password change) | 20% | 92% | Offline sync, PDF evidence pack |
| Security and operations | 15% | 75% | The Dockerfile is **written but never built**; no HTTPS, monitoring or scheduled backups on a real host |
| Tests | 10% | 88% | No end-to-end pipeline test; no website tests |
| **Scale** (cover real areas, not samples) | 15% | **55%** | One whole taluka (Partur) is covered and the pipeline handles any area; the other seven talukas are still 4 km samples |

The biggest single reason backend is not higher is still **scale**: 15% of the weight at 55%, with seven of eight talukas sampled rather than covered.

### Data

| Piece | Weight | Done | What is still missing |
|---|---|---|---|
| Satellite pictures, depth in time | 15% | 90% | The 2018 season |
| Satellite pictures, **spatial coverage** | 25% | **34%** | Whole Partur (762 km²) plus seven 4 km boxes (112 km²) is about **874 km², 11% of Jalna district** (7,688 km², measured from the open taluka outlines). Score is about 3 points per percent of the district covered; the eight boxes alone were 1.65%, worth 5 |
| Rainfall | 10% | 80% | Finer than a 50 km grid; two boxes can share a cell |
| Farmland mask | 10% | 88% | It says "cropland", not which crop |
| Boundaries | 10% | 85% | State, district and taluka done. Villages and plot outlines are not |
| Radar | 5% | 0% | Feed confirmed alive; not built |
| Official records (drought list, damage records) | 10% | 15% | The state total is known; which Jalna talukas are on the list is not |
| **Field observations** | 15% | **0%** | The kit is ready; no plot has been visited |

**Why I lowered data from 55% when I recalibrated it.** The earlier figure gave credit for having some of each ingredient. Counting how much of the district we actually cover and the zero field observations, it was too generous. Three rows hold the data score down: spatial coverage (25% of the weight, 34% done), field observations (15% of the weight, 0%) and radar (0%).

## What the numbers now say (see `validation/BACKTEST.md`; Mantha corrected on 4 November)
- **Separates 2026 from ordinary seasons in 5 of 8 sample areas.** Across all areas: 30% of visible farmland flagged in 2026, 8% in ordinary seasons (46 taluka-seasons).
- **Beats the simple rule clearly.** At the same false-alarm rate the simple "less green than last reading" rule flags 2026 *less* (5%) than ordinary seasons. It cannot see this drought.
- **Not an early warning of weeks.** The signal appears around the 25 September order: +16 and +6 days in two areas, -4, -4 and -14 in others, none in three.
- **The signal holds across a whole taluka, but the 4 km box overstated it.** For Partur as a whole (7,675 farmland cells), 47% was flagged at the order date against 2% to 9% in every ordinary season. The box had said 69%. Detection was 4 days after the order for the whole taluka, against 16 days before it for the box.
- **A sample-box error was found and fixed.** The Mantha box had been placed in the wrong district (Lonar). It was corrected and everything rebuilt; Mantha is now the strongest signal of the eight.
- **2026 rainfall was about 52% of the 2018 to 2025 average** at Jalna and Partur, consistent with a reported deficit near 46%.

## Backend, component by component

| Component | Done | Works now | Still missing |
|---|---|---|---|
| Satellite fetch (Sentinel-2) | 85% | 8 boxes, 2019 to 2026, cloud-masked, runs from this repo alone | Whole-taluka coverage, 2018, radar reader (feed is alive) |
| Farmland mask | 90% | ESA WorldCover cropland share per cell; Jalna box moved to farmland | Crop type (WorldCover only says "cropland") |
| Rainfall | 80% | NASA POWER daily, weekly series endpoint | Finer rainfall; gauge data |
| Crop-stress logic | 65% | Crop-age alignment, thresholds tuned on seasons other than 2026, ranking by excess over usual | Whole-taluka scale, stronger persistence rules, radar gap-fill |
| Web service | 90% | Sign-in, lockout, 5 roles, audit log, photos with checks, evidence pack, simulated orders, admin stats, public accuracy summary | Deployment, HTTPS, real password policy |
| Validation | 45% | Visibility test, backtest, baseline comparison, rainfall cross-check, known-event notes | Field observations, official taluka list, test on new places |
| Tests | 70% | 8 tests on access rules and workflows | Tests for the analysis code |

## Data, type by type

| Data | Status | Note |
|---|---|---|
| Sentinel-2 optical | **Used**, 2019 to 2026 | 8 boxes of 4 km by 4 km, about 1.7% of the district. 2018 not fetched |
| Sentinel-1 radar | Feed confirmed alive, not built | Few cloud gaps in the 2026 stress window, so low priority |
| NASA POWER rainfall | **Used**, 2018 to 2026 | About 50 km grid |
| ESA WorldCover | **Used** | 2021 map; says cropland, not which crop |
| State and district outlines | **Used** | Attribution shown |
| Taluka outlines | Not started | Sample boxes stand in |
| Plot or survey outlines | Not started | Permission unchecked; 200 m cells stand in |
| Official 2026 drought list | State total confirmed (265, later 305); Jalna taluka names **not found** | Needs the resolution annex |
| Field observations | **None** | Target 20 to 30 |

## Field check (new): ready to run, not yet run

| Piece | State |
|---|---|
| Plan (`docs/FIELD_DATA_PLAN.md`) | Written: two tracks (look back at Kharif 2026 now, forward Rabi test from December), rules fixed in advance, sample-size table |
| Blind sample (`validation/field/sample_field.csv`) | Drawn: 26 flagged and 26 not flagged plots across Partur, Ambad and Ghansawangi, 600 m apart, shuffled, no labels. Key fingerprint committed |
| Form and template | Written (`docs/FIELD_FORM.md`, `observations_template.csv`) |
| Field kit | Printable per-plot sheets and an offline phone entry page (tested in a browser: refuses missing severity, records no-consent and not-visited plots, exports the template columns) |
| Evening checker (`backend/field_progress.py`) | Blind-safe; flags duplicates, incomplete rows and spares used without cause |
| Field-day checklist | `docs/FIELD_DAY_CHECKLIST.md`: 40 main plots in three small areas, about one day each |
| Evaluator (`backend/evaluate_field.py`) | Built and tested against known statistical values; refuses a tampered key |
| Accuracy page link | Field rows appear automatically once results exist |
| **Field observations** | **0 collected.** Minimum worth doing is 40 plots (20 per group) |

## The risks I would not hide from a jury
1. **Nothing is checked on the ground yet.** The method and tools are ready, the data is not. The evidence is comparison with past seasons, a rainfall cross-check and a better-than-simple-rule result.
2. **"Early warning" is not supported.** Say "locates and confirms stress at about the order date, plot by plot".
3. **Eight 4 km boxes, not eight talukas.** Thresholds were tuned on the same places that are then tested (different seasons).
4. **Three of eight areas show no signal** (Ghansawangi, Jafrabad, Bhokardan). We should say so, not hide them.
5. **The service-centre idea is unchecked** for fees and rules. The evidence pack is the safer form.

## Choices for what to do next

| # | Option | Why |
|---|---|---|
| 1 | Collect 20 to 30 field observations with photos in Partur | The only way to say "correct" instead of "different from past seasons" |
| 2 | Get the resolution annex and match talukas to the official list | The known-event check at taluka level |
| 3 | Whole-taluka coverage for Partur | Makes the numbers about a real taluka |
| 4 | Phone-first farmer view, evidence-pack screen, Marathi | Frontend work for tonight |
| 5 | Deploy and test offline | Removes stage risk |
| 6 | Radar gap-fill and 2018 season | Strengthens weak spots, lower priority |
