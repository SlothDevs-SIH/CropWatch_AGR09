# How to open, use and rebuild Crop Watch

Everything you need to find and run what we have built. Written for someone who did not build it.

## 1. Start it (30 seconds)

**Easiest:** double-click **`start_cropwatch.bat`** in the project folder. It starts the server and opens `http://127.0.0.1:8100/`.

**By hand** (from `CropWatch/backend`):
```bash
.venv/Scripts/python.exe -m uvicorn server:app --port 8100
```
Then open **http://127.0.0.1:8100/** in a browser.

If the website looks old or is missing, rebuild it once (from `CropWatch/frontend`): `npm run build`.

**On a phone, on the same Wi-Fi:** start the server with `--host 0.0.0.0` instead, find this computer's address (`ipconfig`, the "IPv4 Address", for example 192.168.1.6) and open `http://<that address>:8100/` on the phone. Windows may ask to allow the connection. Only do this on a network you trust, because the demo accounts are open.

## 2. Who can sign in

The sign-in page has **one-click demo buttons** (fake people, fake plot ownership). Their details are in `backend/seed_accounts.py`.

| Account | Where it lands | What it can do |
|---|---|---|
| **District officer** | District page | Ranked talukas on a real taluka map, colour = how unusual for the date; CSV download; reported plots; open any taluka |
| **Taluka officer, Partur** | The whole Partur taluka map | Every plot in the taluka in 3D, "visit first" list, season replay, record field visits, report confirmed plots, open the evidence pack |
| **Farmer (Partur)** | "Your plots" (phone-first) | Only their own plots; answer Stressed / Fine / Not sure with a photo; works without signal for the answer |
| **Service centre operator** | Claim help | Look up one plot id, preview and print the evidence pack, place a **demo** order (no money) |
| **Admin** (`admin@cropwatch.demo`, same demo password as the others) | Admin | Counts, create users, the audit log, evidence status |

Public pages without signing in: the **landing page**, **Accuracy**, **About**.

## 3. Pages and links

The site uses `#` links, so you can bookmark or share them.

| Link | Page |
|---|---|
| `#/` | Landing page (scroll story, the Maharashtra map) |
| `#/login` | Sign in |
| `#/accuracy` | What we have measured, and what we have not |
| `#/about` | How it works, limits, who sees what, credits |
| `#/app/district` | District ranking and map |
| `#/app/area/PartWhole` | Whole Partur taluka (any area key works, for example `JalnaWhole`, `Partur` for the 4 km box) |
| `#/app/area/Partur?plot=PAR-r00c02` | The same, opened on one plot (with its before/after slider) |
| `#/app/reported` | Plots reported to the district |
| `#/app/farmer`, `#/app/centre`, `#/app/admin` | Role pages |

The interactive list of every API call is at **http://127.0.0.1:8100/docs**.

## 4. A six-minute walkthrough for the jury

1. **Landing page.** Let the seed sprout. Scroll: the field with the satellite scan, the four-step scene, the map flying from Maharashtra to Jalna. Click **Accuracy** to show you lead with what is *not* measured.
2. **Sign in as the district officer.** The map flies in over the real taluka outlines. Point at the colours (how unusual for the date) and the ranking. Click the highest-ranked taluka.
3. **The taluka map.** Thousands of plot-sized cells in 3D. Press **Replay the season** and watch stress spread from June to October. Point at the 25 September marker.
4. **Click one plot.** The camera swoops down. Show the reason, then drag the **Before and after** slider: an ordinary year on the left, 2026 on the right. Then the chart against past seasons at the same crop age, and the rainfall strip.
5. **Sign in as the farmer** (phone-sized window). Open a plot, press **Stressed**, add a photo. Switch to **मराठी**.
6. **Back as the taluka officer.** The plot now says **Confirmed**; press **Report to district**. As the district officer, open **Reported**. Finish on **Accuracy**: say plainly what is not yet measured.

## 5. Where things are

```
CropWatch/
  start_cropwatch.bat      start the server and open the site
  refresh_results.bat      rebuild results after new satellite data lands
  render_pictures.bat      pre-render the before/after pictures (slow; do it ahead of time)
  README.md                overview and setup
  Dockerfile               deployment (written, not yet built)
  backend/                 the engine and web service (Python)
    server.py              web service: sign-in, roles, plots, photos, evidence pack, orders, admin
    analysis.py            the maths: levels, crop-age alignment, shares
    fetch_cells.py         read satellite greenness (sample boxes and whole talukas)
    fetch_rain.py, fetch_landcover.py   rainfall and farmland mask
    build_results.py       turn data into levels, reasons and the district ranking
    backtest.py            leave-one-year-out check, tuning, comparison with a simple rule
    make_field_sample.py, make_field_sheets.py, evaluate_field.py, field_progress.py   the field check kit
    tests/                 automated tests
  frontend/                the website (React, MapLibre, Tailwind)
    src/landing/           the landing page
    src/pages/             district, area map, farmer, centre, admin, accuracy, about
  data/results/            what the website shows (one file per area, plus district.json)
  data/raw/                satellite greenness arrays (large, not in git)
  validation/              backtest results, known-event notes, the field check folder
  docs/                    plans and guides (this file, DATA.md, DEPLOY.md, PROGRESS.md, field guides)
```

Repository: https://github.com/SlothDevs-SIH/CropWatch_AGR09 (private).

## 6. Finish the data (whole-taluka coverage)

**Done so far:** whole **Partur** and whole **Ambad** (with past seasons), plus a 4 km sample box in every taluka. Together that is about 2,000 km², roughly **26% of the district**.

**Still downloading in the background:** Jalna, Badnapur, Ghansawangi, Mantha, Jafrabad and Bhokardan. Each needs two files in `data/raw`: `<Name>Whole.npz` (this season) **and** `<Name>Whole_hist.npz` (2019 to 2022). A taluka is not used until **both** exist, because three past seasons are too weak a "normal" and would give misleading numbers. Check:
```bash
dir CropWatch\data
aw\*Whole*
```

**How the ranking behaves.** The district ranking compares like with like. The 4 km boxes overstated both Partur and Ambad, so a ranking that mixed whole talukas with boxes would be unfair. Therefore:
- until **all eight** talukas have a whole area, every taluka is ranked on its 4 km box, and the district page shows the whole-taluka result beside it where we have one (Partur, Ambad);
- once all eight are ready, the ranking switches to whole talukas by itself.

When more files are ready, double-click **`refresh_results.bat`**, then restart the server.

If a background download stopped, restart the missing one from `CropWatch/backend` (each takes about 20 to 60 minutes; a dropped connection is now retried automatically):
```bash
.venv/Scripts/python.exe fetch_cells.py JalnaWhole
.venv/Scripts/python.exe fetch_cells.py JalnaWhole --years 2019 2020 2021 2022 --tag _hist
```
Area names: `PartWhole`, `JalnaWhole`, `BadnapurWhole`, `AmbadWhole`, `GhansawangiWhole`, `ManthaWhole`, `JafrabadWhole`, `BhokardanWhole`.

## 6b. The before/after pictures

Each plot has a **Before and after** slider in its panel: a typical, ordinary year on the left, 2026 on the right, same place and time of year. Drag the handle to compare.

The pictures are **pre-rendered once** (so nothing renders while you present) into `data/imagery/<area>/`. Check what is ready:
```bash
dir CropWatch\data\imagery
```
Each ready area has a `meta.json` and `normal.jpg` plus `now.jpg`. To render or re-render, double-click **`render_pictures.bat`**, or from `CropWatch/backend`:
```bash
.venv/Scripts/python.exe -u render_imagery.py PartWhole Partur        # chosen areas
.venv/Scripts/python.exe -u render_imagery.py --force                 # redo everything
```
It takes from several minutes (a 4 km box) to well over half an hour (a whole taluka). An area with no pictures yet shows a short note instead of the slider, never a blank. Pictures are not stored in git (large); if you move the project, copy `data/imagery`.

## 7. Check that it works

From `CropWatch/backend`:
```bash
.venv/Scripts/python.exe -m pytest -q
```
Expected: all tests pass (access rules, analysis maths, field evaluator, backups, production mode).

## 8. What is real, and what is not

- **Real:** the satellite data, the rainfall, the farmland mask, the maths, the backtest numbers, the access rules, the field check kit.
- **Demo only:** the people and accounts, who "owns" which plot, the simulated orders (no money), the fee shown.
- **Not yet done:** any farmer or field observation (the kit is ready, nobody has visited a plot), a native-speaker check of the Marathi, tests on a real phone or with the network off, a built Docker image, deployment with HTTPS.

See `docs/PROGRESS.md` for percentages and the honest list of limits, and the **Accuracy** page for the measured numbers.
