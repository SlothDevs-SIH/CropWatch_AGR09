# Field data plan: checking Crop Watch against the ground

**Written in plain English.** Everything so far compares satellite pictures with other satellite pictures and with rainfall. None of it asks a farmer. This plan fixes that, and it is built so the result is believable even if it turns out modest.

## 1. What we are trying to find out

For plots Crop Watch flagged as behind normal, how often was the crop really in trouble? And for plots it did **not** flag, how often was it in trouble anyway? The first number says how many alerts are right. The second says what we miss. Without the second, the first means little.

## 2. The timing problem, and the two tracks

It is early November. Kharif soybean is harvested. We cannot stand in a field and watch 2026 stress. So there are two tracks.

| | Track A: look back at Kharif 2026 | Track B: look forward through Rabi 2026-27 |
|---|---|---|
| When | This week and next | December to March |
| How | Ask farmers about this season, collect photos from their phones, collect government damage records | Pick plots before the crop grows, record our prediction, visit later |
| Strength | Tests the real drought we already have data for | Cleanest possible test: the prediction is locked before the answer exists |
| Weakness | Farmers recall from memory. Dates are rough | Needs our code extended to the Rabi season (it only covers June to October now), and it is a different crop and a different weather year |

Do Track A now. Start Track B in December if the team has capacity. Say clearly, in any talk, which track a number came from.

## 3. The rules, fixed before any visit

- **"Stressed on the ground"** means the farmer-reported severity is 2 (moderate, clearly less than a normal year) or 3 (severe or failed). We record the cause they give but count stress whatever the cause. A second figure leaves out plots blamed on pests, disease, flood or hail.
- **We report what we find.** If flagged and unflagged plots are equally stressed, we say Crop Watch did not work on the ground.
- **No cherry-picking.** Plots come from a random sample drawn by `backend/make_field_sample.py`, visited in the listed order, with spares used in their listed order.
- **The team visiting does not know which plots were flagged** (blind). The labels sit in a sealed key file. Its fingerprint (SHA-256) is committed to git before any visit, so nobody can change a label afterwards. The evaluator refuses to run if the key no longer matches.

## 4. How many plots

| Plots per group (flagged / not flagged) | Chance of a clear result if the true stressed rates are 70% and 20% | If they are 60% and 20% |
|---|---|---|
| 10 | 43% | 25% |
| 15 | 67% | 44% |
| **20** | **85%** | 64% |
| 30 | 97% | 86% |

(From a simulation of 4,000 trials per row, Fisher exact test, 5% level.)

- **Minimum worth doing: 40 plots, 20 in each group.**
- 30 plots in total is still useful, but then we show ranges and make **no significance claim**.
- 60 plots is the comfortable target.

## 5. The sample we have drawn

Already generated and sitting in `validation/field/`:

- **26 flagged and 26 not flagged plots** (20 primary plus 6 spares in each group), drawn at random across **Partur, Ambad and Ghansawangi**.
- Why those three: Partur and Ambad showed a strong signal. Ghansawangi showed none, so it is a built-in test of whether we raise false alarms. Spreading across three places also stops one 4 km box from deciding everything.
- Plots in the same taluka are at least **600 m apart**, because neighbouring plots are not independent.
- Each spare is **tied to one specific main plot** in the same taluka and group, so a swap never changes the group balance and never means a long trip. The evaluator only counts a spare when its main plot was marked not visited or refused.
- Files: `sample_field.csv` and `.geojson` (what the team gets, shuffled, no labels, with a map link for each point), `sample_field_meta.json` (seed, settings, key fingerprint), and `sample_field_KEY_SEALED.csv` (kept local, never committed, not opened until visits end).
- **Keep a second copy of the sealed key somewhere safe** (for example, emailed to yourself). If it is lost, the sample cannot be scored.

## 6. Who does what

- **Two pairs**, one phone each for GPS and photos, about 5 to 6 plots per pair per day. Forty plots is about **three to four days**.
- Get a **letter from the college** and, if possible, an introduction through the **taluka agriculture office**, the local **Krishi Vigyan Kendra**, or a village contact. Farmers talk more readily to someone who arrives with a local face.
- The kit is built by `backend/make_field_sheets.py`: printable sheets plus a phone page that works offline. Day-by-day steps are in `docs/FIELD_DAY_CHECKLIST.md`; `backend/field_progress.py` is the evening check.
- Use the printable questions in `docs/FIELD_FORM.md`. Enter answers into `validation/field/observations.csv` (start from `observations_template.csv`).
- Second person checks 10 photos and re-scores severity from the photo alone, to see how much two people agree.

## 7. Other ground truth to ask for in parallel (each is a letter or a visit, not code)

1. **Crop-damage assessment (panchnama) records** from the talathi or tahsildar for villages inside our three boxes.
2. **Crop insurance (PMFBY) calamity intimations and claim counts** for those villages.
3. **Crop-cutting experiment results** by revenue circle, if released.
4. **KVK or agriculture-office advisories** for Jalna in August to October 2026.
5. **Dated photos from farmer WhatsApp groups**, with permission.

These are partial and slow, but each one is an independent check, and an official record carries weight a student survey does not.

## 8. Consent and privacy

- Say who we are and what we are doing. Ask permission. Accept "no". Record `consent_given`.
- **No names, phone numbers or ID numbers anywhere.** The cell id is the only identifier.
- Photograph crops and fields, not people.
- Keep the observation file and photos out of public git (they are listed in `.gitignore`). Share only the summary numbers.
- India's Digital Personal Data Protection Act, 2023, applies to personal data. Because we collect none, the main duty is to keep it that way. Confirm with a mentor.

## 9. How the result is read and said

`backend/evaluate_field.py` gives, with 95% ranges:

- the **share stressed among flagged plots** (our alert precision),
- the **share stressed among unflagged plots** (what we miss),
- agreement (Cohen's kappa) and a Fisher exact p value,
- a rough **lead time**: how many days before the farmer says they noticed that we flagged (farmers recall from memory, so this is soft),
- the same numbers by taluka and leaving out plots blamed on pests or floods.

It also feeds the public accuracy page automatically once `field_result.json` exists.

How to say each outcome, honestly:

| What we find | What we can say |
|---|---|
| Flagged much more stressed than unflagged, 20+ per group | "Of plots we flagged, X% were confirmed stressed, against Y% of plots we did not flag (n, range)." |
| Same, but under 20 per group | "In a pilot of n plots, X against Y. Too few to be sure." |
| Little or no difference | "On the ground, the flags did not separate stressed plots. We are not claiming it works." |
| Flagged plots stressed, but many unflagged plots also stressed | "Alerts are mostly right, but it misses some real stress." |

## 10. Timeline

| When | What |
|---|---|
| Today | Commit the blind sample and its key fingerprint (this is the "pre-registration"). Print the sheets and the form. Ask for the college letter. Back up the sealed key |
| Next 3 to 4 days | Visits, in sheet order. Photos backed up the same evening |
| Day after | Enter data, second person scores 10 photos, run `evaluate_field.py` |
| Same day | Update the accuracy page and the slides with whatever came out |
| December | Decide on the Rabi forward test; extend the season window in the code |

### If the visits cannot happen before the presentation
Say exactly this: "The ground check is designed and registered. The sample is drawn blind and locked by a fingerprint. Visits are scheduled for these dates." Do **not** show invented field numbers. If you manage even 10 plots, show them as a pilot with the ranges.

## 11. Risks and what to do

| Risk | What to do |
|---|---|
| Farmers recall poorly | Prefer photos and records; treat dates as rough; keep severity as the main measure |
| The crop is not soybean (cotton, tur, fallow) | Record the crop. Report all, and soybean only as a second figure |
| A 200 m cell holds several farmers' plots | Ask about the largest share, record `crop_share_pct`, and note it |
| People guess which plots were flagged | Shuffled order, no labels on any sheet, and record if someone knew |
| Nobody will talk to us | Go through the agriculture office or KVK; use official records instead |
| Too few unflagged plots in a box | Already handled by sampling across three talukas; a fourth can be added |
| The result is bad | Publish it. A modest honest result beats a big one nobody can check |

## 12. What the team needs to decide

1. Who goes, and on which days.
2. Whether to add a fourth taluka, to reach 30 per group.
3. Who contacts the taluka office, the KVK and a village contact.
4. Whether to commit to the Rabi forward test in December.
5. Who holds the backup copy of the sealed key.
