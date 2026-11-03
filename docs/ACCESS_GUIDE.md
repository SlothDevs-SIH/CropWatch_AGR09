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
| `#/app/area/Partur?plot=PAR-r00c02` | The same, opened on one plot |
| `#/app/reported` | Plots reported to the district |
| `#/app/farmer`, `#/app/centre`, `#/app/admin` | Role pages |

The interactive list of every API call is at **http://127.0.0.1:8100/docs**.

## 4. A six-minute walkthrough for the jury

1. **Landing page.** Let the seed sprout. Scroll: the field with the satellite scan, the four-step scene, the map flying from Maharashtra to Jalna. Click **Accuracy** to show you lead with what is *not* measured.
2. **Sign in as the district officer.** The map flies in over the real taluka outlines. Point at the colours (how unusual for the date) and the ranking. Click the highest-ranked taluka.
3. **The taluka map.** Thousands of plot-sized cells in 3D. Press **Replay the season** and watch stress spread from June to October. Point at the 25 September marker.
4. **Click one plot.** The camera swoops down. Show the reason, the chart against past seasons at the same crop age, and the rainfall strip.
5. **Sign in as the farmer** (phone-sized window). Open a plot, press **Stressed**, add a photo. Switch to **मराठी**.
6. **Back as the taluka officer.** The plot now says **Confirmed**; press **Report to district**. As the district officer, open **Reported**. Finish on **Accuracy**: say plainly what is not yet measured.

## 5. Where things are

```
CropWatch/
  start_cropwatch.bat      start the server and open the site
  refresh_results.bat      rebuild results after new satellite data lands
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

Whole Partur is complete. Other talukas are being read in the background, one file pair each (current season, then 2019 to 2022): `data/raw/<Name>Whole.npz` and `<Name>Whole_hist.npz`. A taluka is ready when **both** files exist. Check:
```bash
dir CropWatch\data\raw\*Whole*
```
When more are ready, double-click **`refresh_results.bat`**, then restart the server. Each ready taluka is then ranked on its whole area; talukas not ready yet fall back to their 4 km sample box (the district page labels each one).

If the background downloads were stopped, restart any missing one from `CropWatch/backend`:
```bash
.venv/Scripts/python.exe fetch_cells.py JalnaWhole
.venv/Scripts/python.exe fetch_cells.py JalnaWhole --years 2019 2020 2021 2022 --tag _hist
```
(each takes roughly 20 to 60 minutes). Area names: `PartWhole`, `JalnaWhole`, `BadnapurWhole`, `AmbadWhole`, `GhansawangiWhole`, `ManthaWhole`, `JafrabadWhole`, `BhokardanWhole`.

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
