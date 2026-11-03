# Field-day checklist

Built from the real sample in `validation/field/`. Everything here works without internet except the map links.

## The plan in numbers

| Taluka | Main plots | Spares | Area the plots sit in |
|---|---|---|---|
| Partur | 14 | 4 | about 3.6 km by 3.6 km |
| Ambad | 14 | 4 | about 3.6 km by 3.8 km |
| Ghansawangi | 12 | 4 | about 3.4 km by 3.8 km |
| **Total** | **40** | **12** | |

Each taluka's plots are packed into one small area, so **one day per taluka** is realistic with two pairs (about 7 plots per pair). That makes **three field days**, plus a spare day for weather or plots that fall through. Travel between the three areas is the long part, so check the roads before you set the days.

## Before the first day

- [ ] Run `python make_field_sheets.py` in `backend/` (already done once; rerun if the sample changes). It writes `validation/field/sheets/`.
- [ ] **Print `field_sheets.html`** (open it in a browser, Print, Save as PDF, or print directly). One page per plot, grouped by taluka.
- [ ] **Copy `field_entry.html` to every phone** (WhatsApp it to yourself, Drive, or USB). Open it once in the phone browser so you know it works. It saves on the phone and needs no signal.
- [ ] **Make a second copy of `sample_field_KEY_SEALED.csv` somewhere safe** (email it to yourself). **Do not open it.** If it is lost, the plots cannot be scored.
- [ ] College letter, and a contact at the taluka agriculture office, the KVK, or a village.
- [ ] Phone clocks set correctly (photo dates matter). GPS on. Storage free for photos.
- [ ] Power bank, water, hat, a pen and clipboard.
- [ ] Agree in advance who asks, who writes, who photographs. Swap roles halfway.

## On each plot (about 10 minutes)

1. Walk to the GPS point. Check you are on the right field.
2. Say the consent words from the sheet. If no, mark **no consent**, thank them, go to the next plot.
3. Ask the questions in order. Write the farmer's words, not yours.
4. One clear photo of the crop or field. No faces.
5. Save on the phone page. It will refuse a visited plot without a severity and a skipped plot without a reason.

## When a plot cannot be visited

- Mark **Not visited** and write why (no access, farmer away, wrong field).
- Use **only the spare named on that plot's page** ("Use only if plot X could not be visited"). Spares are tied to one specific plot, in the same taluka. **Do not pick another plot because it looks easier or more interesting.**
- A refused consent counts the same way: the named spare replaces it.

## Every evening (10 minutes)

- [ ] On each phone, tap **Export all as CSV**. Send the CSV to yourself.
- [ ] Back up the day's photos into `validation/field/photos/` (file names must match what you wrote).
- [ ] Merge the phones' CSVs into `validation/field/observations.csv` (same header; one row per plot).
- [ ] Run `python field_progress.py`. It lists plots done per taluka, which spares you may now use, and anything missing or odd. Fix what it lists.
- [ ] Do **not** look at the sealed key, and do not guess which plots were flagged.

## When all main plots are done

1. A second person re-scores severity from **10 photos alone** and the two scores are compared.
2. Run `python evaluate_field.py`. It checks the sealed key still matches its fingerprint, then writes `validation/field/field_result.json` and `validation/FIELD_RESULT.md`.
3. The public accuracy page picks the numbers up by itself.
4. Commit the **summary** (`FIELD_RESULT.md` and `field_result.json`). Do **not** commit `observations.csv`, photos or the key file (they are in `.gitignore`).

## If something goes wrong

| Problem | Do this |
|---|---|
| A farmer asks why we want to know | Say it is a student project on whether satellite pictures show crop trouble early. Nothing is sold, no names are kept |
| Plot is fallow or a different crop | Record it anyway (crop column). Do not skip it |
| Square covers several farmers | Ask about the biggest share, write that share in the crop-share box, note it |
| GPS is off by more than 30 m | Write the accuracy, find the farmer who works that ground, note it |
| You accidentally learn which plots were flagged | Tick "knew the label" on the sheet. The result is still usable, flagged as such |
| Phone page loses data | Export every evening, so you lose one day at most |
| Fewer than 40 plots by the deadline | Stop, run the evaluator, and say "pilot of n plots" with the ranges. Never top up from plots you picked yourself |
