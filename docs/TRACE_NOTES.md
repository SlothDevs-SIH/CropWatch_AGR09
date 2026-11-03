# Notes on the T.R.A.C.E. website (what we saw, and what we may borrow)

**Seen on 3 November 2026**, running from a copy of the public repository `Darksoul913/T.R.A.C.E`, on this computer only.

## What it is

A single web page that opens on a landing screen ("Change, mapped from orbit"), then an **"Open console"** button. The console covers 28 places: five featured scenes (Mumbai, Mumbai 2019 to 2025, the Evros wildfire, the Trimmu flood, a Texas sample) and 23 more cities.

## What the console shows (we opened it and looked)

- A top bar with the place, dates and satellite name.
- Buttons for **Upload and Detect**, **Pixel Inspector**, **Full Report (PDF)**.
- A switch between **T.R.A.C.E. AI** and **Naive NDVI** (their simple baseline).
- **Overview**, **Team progress** and **Benchmark** buttons.
- A left panel called **Cases** with these views: **What matters, High priority, Uncertain, Needs verification, All changes**, a search box, and a ranking choice (Encroachment or Disaster).
- Four counters: changes and area, high priority, to verify, uncertain, and "not observable".
- A first-open summary card: "13 changes between 30 Nov 2015 and 19 Mar 2018. 5 need a decision first."
- A map with a **Before / Swipe / After** control. The selected area is outlined so you can see the picture inside it.

## Ideas we like (we will build our own versions)

1. **Attention views.** The list is not just "all items". It offers "what matters first", "needs verification" and "uncertain". This is the same idea as our "visit first" list.
2. **Opening summary card.** One sentence that says how many things need a decision first.
3. **The "uncertain" and "not observable" counters.** This matches our "cannot see" rule, and they show it on the front screen.
4. **Naive baseline switch.** They let the viewer flip between their method and a plain greenness method. We need the same for our proof.
5. **Case card.** What changed, why it matters, how reliable, and a suggested next step.
6. **Time strip and field workflow.** Moving through dates, and logging a field decision that works offline.
7. **Data quality score.** A single number saying how comparable two satellite pictures are.

## What we will not take

- Their giant single page (about 55 MB including data).
- The citizen alert portal and alert-message export. They are outside our problem.
- The AI chat helper. It needs an outside AI service and a key.

## Warnings

1. **Licence.** Their README shows an "MIT licence" badge and links to a `LICENSE` file, but **no LICENSE file is in the repository**. So we do not know our rights to copy their code. **Plan: borrow ideas and layouts, write our own code, and credit them where we mention the idea.** Do not paste their code into our project unless the team gets written permission or a licence file appears.
2. **Their weak points we will not repeat:**
   - Their ten-metre urban change score is low (F1 about 0.22) and their results script (`evaluate.py`) does not run as published.
   - Their "11.6% seasonal false alarm" figure is not in the committed results file.
   - They show no margins of uncertainty.
   We will show margins and keep every number reproducible.
3. **What runs and what does not on this computer:** their *website* runs offline from files. Their *upload-and-analyse backend* needs software we have not installed here (raster and map libraries, a deep-learning add-on, a report library, an AI client). It is not needed for studying the look and feel.

## How it was started here (for the record)

A small file server (written by us, in the scratch folder) serves the website's folder and also serves it under `/static/`, which their own backend normally does. The page needs that path to load its 8 MB data script. It runs at `http://127.0.0.1:8000/index.html`.
