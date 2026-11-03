# Today's Plan: from nothing to a working demo before the presentation

**Reality check first:** the full system in `BACKEND.md` and `FRONTEND.md` is a multi-day job. Today we build the **smallest honest demo** that proves the idea on one taluka and one season, and we say clearly what is planned and what is done. A smaller demo that works beats a bigger one that breaks.

**Demo core (must work):** a map of one taluka with villages coloured by level, a ranked "visit first" list, a village page with a chart, a field-check form, and an accuracy page that says "to be determined" where we have no number.

## Roles for today (suggested; swap freely)

| Person | Focus |
|---|---|
| Soham | Fetch satellite and radar pictures, build village health numbers |
| Kaushal | Map, list and village page |
| Shreyas | Alert logic, the "normal" curve and the baseline |
| Vedashree | Field observations, the 2026 drought check, the accuracy page text |

## Hour-by-hour (adjust to the clock)

| Block | What | Done when |
|---|---|---|
| Hour 0 to 0.5 | Pick the taluka, crop and village outlines. Open `BACKEND.md` section 3 and decide. | Names written at the top of `README.md` |
| 0.5 to 2 | Soham: reuse the GeoAI picture-fetching code for one clear week and show it on a map. Kaushal: build the empty map and list with sample data. | A real picture and the empty app both appear |
| 2 to 4 | Soham: fetch all weeks plus a few past seasons. Shreyas: build the "normal" curve and first alert levels. Vedashree: collect the list of declared drought talukas and dates, and any field points. | A table of village, week, level exists |
| 4 to 6 | Connect the real table to the app. Add the village page chart and the "cannot see" display. Add the simple baseline. | Villages are coloured from real data |
| 6 to 7 | Field-check form, offline saving, accuracy page with honest "to be determined" labels. | A saved field check shows on the village page |
| 7 to 8 | Run the known-event check against the 2026 drought order. Fill whatever numbers are real. | Numbers on the accuracy page come from files |
| 8 to 9 | Phone layout, "demo data" badge, no-network test. Rehearse the presentation with the deck and the script. | The demo works on the laptop that will be used tomorrow |

## If time runs out, cut in this order

1. Skip Marathi.
2. Skip the before/after swipe.
3. Skip offline mode for the field form.
4. Keep, no matter what: **map, ranked list, village page, "cannot see" display, honest accuracy page.**

## What to say if the demo is not finished

"The pipeline and screens shown are working on one taluka and one season. The accuracy numbers are not measured yet, and we show exactly which ones." Never show an invented number.

## Before the presentation

1. Test on the laptop that will be used, with Wi-Fi switched off.
2. Close the T.R.A.C.E. window. It is only for study and must not appear in the demo.
3. Have `AGR09_CropWatch_v5.pptx` open as the main file, and the app ready in a second window.
4. Read the script out loud twice with a timer.
