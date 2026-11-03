# Data dictionary

Everything in `data/` and how to rebuild it. All sources are free and open. Large raw files are not in git; the scripts recreate them.

| Folder | What | Made by | In git? | Source and licence |
|---|---|---|---|---|
| `data/raw/<taluka>.npz` | Greenness (NDVI) per 200 m cell per satellite scene, 2023 to 2026 | `backend/fetch_cells.py` | No (large) | Copernicus Sentinel-2 L2A via the public Earth Search COG bucket. "Contains modified Copernicus Sentinel data" |
| `data/raw/<taluka>_hist.npz` | The same for 2019 to 2022 | `fetch_cells.py --years 2019 2020 2021 2022 --tag _hist` | No (large) | Same |
| `data/rain/<taluka>.json` | Daily rainfall, June to October, 2018 to 2026, in mm | `backend/fetch_rain.py` | Yes | NASA POWER PRECTOTCORR, about 0.5 degree grid. Coarse |
| `data/landcover/<name>.json` | Share of each land class in every cell (200 m in the boxes, 300 m for whole Partur) | `backend/fetch_landcover.py` | Yes | ESA WorldCover 2021 v200, CC BY 4.0 |
| `data/raw/PartWhole.npz`, `_hist.npz` | The whole Partur taluka: 156 x 96 cells of 300 m, 2019 to 2026 | `fetch_cells.py PartWhole` | No (large) | Same as above |
| `data/coverage.json` | Real areas: each taluka, each box, and the share covered | `backend/make_taluka_outlines.py` | Yes | Derived from open taluka outlines |
| `frontend/public/jalna_talukas.json` | Simplified outlines of the eight Jalna talukas | `backend/make_taluka_outlines.py` | Yes | geoBoundaries ADM3 (LGD via Pathways Data, ODbL). Attribution required |
| `data/results/` | Levels, reasons, series per cell and the district ranking | `backend/build_results.py` | Yes | Derived from the above |
| `frontend/public/maharashtra.json` | Simplified state and district outlines | `backend/make_boundaries.py` | Yes | geoBoundaries (DataMeet CC BY 2.5 IN; Pathways Data / LGD ODbL). Attribution required |
| `validation/` | Visibility test, backtest, known-event notes | `backend/visibility_test.py`, `backend/backtest.py` | Yes | Ours |

## How a cell is read
- The 4 km sample box around each taluka town is read at 20 m. Clouds, shadow, water and snow are masked using the scene classification layer. A 200 m cell needs at least 30 of its 100 pixels clear, else it has no reading for that scene.
- A cell counts as **farmland** only if at least half of it is cropland in ESA WorldCover.
- Readings are averaged into 10-day bins from 1 June.

## Correction made on 4 November
The first Mantha sample box used coordinates I had guessed, and it lay in Lonar, outside Jalna district. Every earlier Mantha number was therefore wrong. It was found by checking all boxes against open taluka outlines, moved to farmland inside the real Mantha taluka, and refetched. All eight boxes now lie fully inside their own taluka (`data/coverage.json`). The corrected Mantha is the strongest signal of the eight.

## Known limits
- Seven talukas are one 4 km box each (about 112 km²). Partur is covered whole (762 km²). Together that is about 874 km², **11% of the district's 7,688 km²**.
- Rainfall is a coarse grid; two boxes can share a cell.
- WorldCover is 2021, so land use may have changed. It does not say which crop is grown, only "cropland".
- The Jalna box was moved from the town (18% cropland) to rural land (96%).

## Rebuild order
```
fetch_cells.py            # about 1 hour per set of seasons
fetch_cells.py PartWhole  # the whole Partur taluka, then again with --years 2019 2020 2021 2022 --tag _hist
make_taluka_outlines.py   # taluka outlines and coverage (needs the ADM3 file in data/boundaries_src)
fetch_cells.py --years 2019 2020 2021 2022 --tag _hist
fetch_rain.py
fetch_landcover.py
backtest.py --tune        # chooses thresholds from seasons other than 2026
build_results.py
```
