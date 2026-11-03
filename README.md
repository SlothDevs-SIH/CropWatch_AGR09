# Crop Watch (AGR-09): Project Folder

**Village-level crop stress early warning for one taluka, one season.**
Team SlothDevs: Soham, Kaushal, Shreyas, Vedashree.

This folder is where we build the real project. Start here.

## Where this folder is

`C:\Soham\college work\CropWatch\`. This is a new project, separate from GeoAI. The two main files are `docs/BACKEND.md` and `docs/FRONTEND.md`.

**New here? Read `docs/ACCESS_GUIDE.md`.** To run it, double-click `start_cropwatch.bat`.

## Decisions so far

| Decision | Status |
|---|---|
| Taluka | **Leading candidate: Jalna area (Marathwada). Backup: Dharashiv.** Visibility test done, see `validation/VISIBILITY_RESULT.md`. Konkan showed no drought signal. Beed not yet tested |
| Crop | Soybean (Kharif 2026), with sugarcane as backup |
| Backend | Files plus a tiny service (same as GeoAI) |
| Money idea | Evidence pack sold through service centres, simulated in the demo. Needs checking, see `docs/BACKEND.md` section 7 |

## What is built (basic version, 3 November 2026)

| Part | Where | Status |
|---|---|---|
| Real satellite fetch for 8 Jalna talukas | `backend/fetch_cells.py` | Runs, saves to `data/raw/` |
| Levels, reasons, district ranking | `backend/build_results.py` | Runs, saves to `data/results/` |
| Web service: logins, roles, field checks, reporting | `backend/server.py` | Working, access rules tested |
| Website: landing, sign in, district ranking, 3D taluka map with fly-in, plot panel, accuracy page | `frontend/` | Working |

**To run (from `CropWatch/backend`):**

```bash
.venv/Scripts/python.exe build_results.py
.venv/Scripts/python.exe -m uvicorn server:app --port 8100
```

Then open `http://127.0.0.1:8100/`. To change the website: in `CropWatch/frontend` run `npm run build` (or `npm run dev` for live editing on port 5180). Demo accounts are fake and are listed by the sign-in page; their details are in `backend/seed_accounts.py`.

**Honest limits of this version:** each taluka is one 4 km sample box, "plots" are 200 m cells, thresholds are provisional and not tuned, and the comparison is by calendar date, not crop age, so late-season harvest differences can inflate the "behind normal" share. Treat the percentages as a demo, not a result. See `validation/VISIBILITY_RESULT.md` and `docs/ROLES_AND_FEATURES.md`.

## What is in this folder

| File | What it is |
|---|---|
| `docs/BACKEND.md` | How the "engine room" will be built, in plain English |
| `docs/FRONTEND.md` | How the screens the officer sees will be built, in plain English |
| `docs/TRACE_NOTES.md` | What we saw in the T.R.A.C.E. website, and which ideas we may borrow |
| `docs/TODAY_PLAN.md` | An hour-by-hour plan to have a working demo before the presentation |

Related files one level up (`C:\Soham\college work`):
- `AGR09_PROJECT_PLAN.md`: the full project story (problem, cases, solution)
- `AGR09_CropWatch_v5.pptx`: the presentation
- `AGR09_PRESENTATION_SCRIPT.md`: what to say, and the Q&A

## Folders we will fill as we build

```
CropWatch/
  docs/          the plans (these files)
  backend/       the engine: collects, cleans, compares, scores
  frontend/      the website the officer uses
  data/          satellite pictures and results for our taluka (not uploaded to GitHub)
  validation/    field observations and the checks that prove it works
```

## The three source projects we were given

1. **GeoAI 04 (our own, SlothDevs-SIH/GEOAI_04_SLOTHDEV).** Our earlier change-detection website. It already has code for finding satellite pictures for any area and date, hiding clouds, reading radar, drawing a before/after swipe map, working offline and being tested. We reuse ideas and code from it freely because it is ours.
2. **T.R.A.C.E. (the winning team's project, Darksoul913/T.R.A.C.E).** We read it and now have its website running on this computer for study. See `docs/TRACE_NOTES.md` for what to borrow and the licence warning.
3. **Our own Crop Watch plan and deck** (the files listed above).

## How to see the T.R.A.C.E. website again

It was started from a copy kept in a temporary folder. If it stops, ask Claude to start it again, or use these steps:

1. Open a terminal.
2. Run: `python "C:\Users\Soham\AppData\Local\Temp\claude\C--Soham-college-work\f247c6f4-5c98-45f4-a5ed-4bab53026ddc\scratchpad\serve_trace.py" "C:\Users\Soham\AppData\Local\Temp\claude\C--Soham-college-work\f247c6f4-5c98-45f4-a5ed-4bab53026ddc\scratchpad\trace_repo\repo\web" 8000`
3. Open `http://127.0.0.1:8000/index.html` in a browser and press "Open console".

Only the website part runs this way. T.R.A.C.E.'s upload-and-analyse engine needs extra software that is not installed on this computer.

## Rebuild the data and run the checks (from `backend/`)

```bash
.venv/Scripts/python.exe fetch_cells.py                                   # 2023 to 2026
.venv/Scripts/python.exe fetch_cells.py --years 2019 2020 2021 2022 --tag _hist
.venv/Scripts/python.exe fetch_rain.py
.venv/Scripts/python.exe fetch_landcover.py
.venv/Scripts/python.exe backtest.py --tune                               # chooses settings from seasons other than 2026
.venv/Scripts/python.exe build_results.py
.venv/Scripts/python.exe -m pytest -q                                      # 8 tests on access rules and workflows
```

Setup: Python 3.12, `pip install -r backend/requirements.txt`. Data sources, limits and what each folder holds are in `docs/DATA.md`. Backtest results and their limits are in `validation/BACKTEST.md`. The latest status is in `docs/PROGRESS.md`.
