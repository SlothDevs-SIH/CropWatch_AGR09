# Data dictionary

Everything in `data/` and how to rebuild it. All sources are free and open. Large raw files are not in git; the scripts recreate them.

| Folder | What | Made by | In git? | Source and licence |
|---|---|---|---|---|
| `data/raw/<taluka>.npz` | Greenness (NDVI) per 200 m cell per satellite scene, 2023 to 2026 | `backend/fetch_cells.py` | No (large) | Copernicus Sentinel-2 L2A via the public Earth Search COG bucket. "Contains modified Copernicus Sentinel data" |
| `data/raw/<taluka>_hist.npz` | The same for 2019 to 2022 | `fetch_cells.py --years 2019 2020 2021 2022 --tag _hist` | No (large) | Same |
| `data/rain/<taluka>.json` | Daily rainfall, June to October, 2018 to 2026, in mm | `backend/fetch_rain.py` | Yes | NASA POWER PRECTOTCORR, about 0.5 degree grid. Coarse |
| `data/landcover/<taluka>.json` | Share of each land class in every 200 m cell | `backend/fetch_landcover.py` | Yes | ESA WorldCover 2021 v200, CC BY 4.0 |
| `data/results/` | Levels, reasons, series per cell and the district ranking | `backend/build_results.py` | Yes | Derived from the above |
| `frontend/public/maharashtra.json` | Simplified state and district outlines | `backend/make_boundaries.py` | Yes | geoBoundaries (DataMeet CC BY 2.5 IN; Pathways Data / LGD ODbL). Attribution required |
| `validation/` | Visibility test, backtest, known-event notes | `backend/visibility_test.py`, `backend/backtest.py` | Yes | Ours |

## How a cell is read
- The 4 km sample box around each taluka town is read at 20 m. Clouds, shadow, water and snow are masked using the scene classification layer. A 200 m cell needs at least 30 of its 100 pixels clear, else it has no reading for that scene.
- A cell counts as **farmland** only if at least half of it is cropland in ESA WorldCover.
- Readings are averaged into 10-day bins from 1 June.

## Known limits
- One 4 km box per taluka, not the whole taluka (about 1.7% of the district's area).
- Rainfall is a coarse grid; two boxes can share a cell.
- WorldCover is 2021, so land use may have changed. It does not say which crop is grown, only "cropland".
- The Jalna box is mostly the city (18% cropland), so it is a weak sample. It should be moved to rural land.

## Rebuild order
```
fetch_cells.py            # about 1 hour per set of seasons
fetch_cells.py --years 2019 2020 2021 2022 --tag _hist
fetch_rain.py
fetch_landcover.py
backtest.py --tune        # chooses thresholds from seasons other than 2026
build_results.py
```
