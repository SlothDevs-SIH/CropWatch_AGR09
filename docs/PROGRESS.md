# Crop Watch: Progress Report (updated 4 November 2026, field plan added)

**How to read the percentages.** They are my estimates, not measurements. A percentage means: how much of what we planned for a demo we could defend in front of a jury is built and tested.

## Overall

| Area | Done | Change since last report |
|---|---|---|
| Backend | **about 72%** (was 42%) | Farmland mask, rainfall, crop-age alignment, tuned thresholds, baseline comparison, audit log, lockout, photos, evidence pack, orders, 8 tests |
| Data | **about 55%** (was 15%) | Seven past seasons, rainfall, farmland mask, state and district outlines, drought-event notes |
| Frontend | **about 55%** (was 52%) | Accuracy page and district cards now show real numbers. Landing text corrected |
| Validation | **about 52%** (was 45%) | Backtest, baseline comparison, rainfall cross-check, **field plan, blind sample and evaluator built**. Still no ground observations |
| **Whole project** | **about 60%** (was 58%) | The ground check is designed and ready to run, but not run |

Commits: 94 on `main`. Tests: 14 passing (`backend/tests`).

## What the numbers now say (see `validation/BACKTEST.md`)
- **Separates 2026 from ordinary seasons in 5 of 8 sample areas.** Across all areas: 26% of visible farmland flagged in 2026, 8% in ordinary seasons (45 taluka-seasons).
- **Beats the simple rule clearly.** At the same false-alarm rate the simple "less green than last reading" rule flags 2026 *less* (5%) than ordinary seasons. It cannot see this drought.
- **Not an early warning of weeks.** The signal appears around the 25 September order: +16 and +6 days in two areas, -4, -4 and -14 in others, none in three.
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
