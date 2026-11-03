# Crop Watch: Progress Report (3 November 2026)

**How to read the percentages.** They are my estimates, not measurements. A percentage means: how much of what we planned for a demo we could defend in front of a jury is built and tested. 100% is not "finished product"; it is "everything in the plan for the demo works end to end".

## Overall

| Area | Done | One-line reason |
|---|---|---|
| Backend | **about 42%** | Fetching and the web service work. The crop-stress logic is a first draft, and almost nothing is measured. |
| Frontend | **about 52%** | Landing page and core screens work. Farmer view, evidence pack, Marathi and offline do not exist yet. |
| Data | **about 15%** | One satellite source, in 8 small sample boxes. Everything else is missing. |
| **Whole project** | **about 40%** | Backend 40%, frontend 40%, data 20% weighting. |

What exists in numbers: about 730 lines of Python, about 1,750 lines of website code (of which about 1,100 are the landing page), about 550 lines of plans, 62 tracked files, 3,200 plot-sized cells across 8 sample boxes (2,870 farmland), 1,552 satellite scene reads.

## Backend, component by component

| Component | Done | Works now | Still missing |
|---|---|---|---|
| Satellite fetch (Sentinel-2) | 70% | 8 sample boxes, June to October, 2023 to 2026, cloud-masked, per 200 m cell | Radar, rainfall, farmland mask, whole-taluka coverage. Depends on our older GeoAI code by an absolute path on one laptop, so it does not run elsewhere yet |
| Crop-stress logic (levels, reasons, ranking) | 35% | Normal, Watch, Urgent, Cannot see, with a reason sentence and a confidence | Compared by calendar date, not crop age. No sowing-date estimate. Thresholds are guesses, not tuned on separate data. Simple-baseline comparison not run |
| Web service (logins, roles, checks, reports) | 70% | Sign-in, three roles, access rules, field checks, reporting rule. Tested for wrong password, wrong role, wrong plot | Photo upload, audit log, admin screens, rate limiting, deployment |
| Validation and accuracy | 10% | Visibility test on 7 sites (Marathwada and Konkan) | Known-event check against the 25 September order, 20 to 30 field points, baseline comparison, margins |
| Evidence pack and simulated orders | 0% | Nothing | The whole feature, plus the legal check on the service-centre idea |

## Frontend, component by component

| Screen | Done | Works now | Still missing |
|---|---|---|---|
| Landing page | 85% | Preloader, animated field, pinned four-step scene, scroll-driven map flight, roles, promise, finale. Phone layout | Marathi, test on a slow laptop and projector, real screenshots in place of illustrations |
| Sign-in | 70% | Sign-in, demo accounts, session restore | Sign-up, password reset |
| District officer view | 60% | Ranked talukas with "could not see" shown beside each | Reported-plots list, filters, download, whole-taluka numbers |
| Taluka map and plot list | 65% | 3D cells, fly-in, "visit first" list, filters | Date slider, before and after picture swipe, phone layout |
| Plot panel and verification | 70% | Chart against normal, reason, history, confirm or dispute, field visit, report | Photo, offline saving, rainfall strip |
| Farmer view | 40% | Sees only own plots and can respond | A phone-first screen, Marathi, photo |
| Accuracy page | 25% | Honest "to be determined" rows | Real numbers (blocked by validation) |
| Claim help and evidence pack | 0% | Nothing | The whole feature |
| Admin screens, Marathi, offline mode | 0 to 10% | Nothing | All three |

## Data, type by type

| Data | Needed for | Status | Note |
|---|---|---|---|
| Sentinel-2 optical pictures | Greenness | **Used** | 8 boxes of 4 km by 4 km, about 1.7% of Jalna district's area (approximate) |
| Sentinel-1 radar | Seeing through cloud | Not started | Check first whether the Planetary Computer feed stopped in April 2026 |
| CHIRPS rainfall | Context for a weak crop | Not started | |
| ESA WorldCover | Farmland mask | Not started | We use a greenness rule as a stand-in |
| Past seasons before 2023 | A stronger "normal" | Not started | Only 2023 to 2025 now, and 2023 was itself a dry year in parts |
| State and district outlines | Maharashtra map | **Done** | geoBoundaries; attribution required and shown |
| Taluka outlines | Real taluka coverage | Not started | Sample boxes stand in |
| Plot or survey-number outlines | True plots | Not started | Need to check permission to use. 200 m cells stand in |
| Official 2026 drought list and order | Known-event check | Not obtained | Needed for the core proof |
| Field observations with photos | Confirming alerts | None yet | Target 20 to 30 |

## The risks I would not hide from a jury

1. **The accuracy claim is not yet backed by anything measured.** The only evidence is a visibility test showing a signal exists in two Marathwada sample areas.
2. **The district ranking comes from one 4 km box per taluka**, so it is a sample, not a taluka result. Even the lowest "behind normal" share is high, which suggests the baseline is off. Treat the order as a hint, not a finding.
3. **The service-centre idea is unchecked.** Fees, rules and automation limits must be verified before it is pitched.

## Choices for what to do next (highest value first)

| # | Option | Why | Rough size |
|---|---|---|---|
| 1 | Tune and test the alert rules on separate seasons, run the simple baseline | Turns the claims into numbers. This is the pitch | Large |
| 2 | Known-event check against the 25 September order | Gives "days of warning", the strongest line we could have | Medium, blocked on getting the official list |
| 3 | Whole-taluka coverage for Partur (or the pilot taluka) | Makes the numbers about a real taluka | Medium |
| 4 | Evidence pack with simulated orders | Completes the money story, after the legal check | Medium |
| 5 | Phone-first farmer view and Marathi | Makes the farmer story real | Medium |
| 6 | Deploy and make the demo run offline | Removes stage risk | Small to medium |
| 7 | Real plot outlines | Makes "every plot" literal | Unknown until permission is checked |
