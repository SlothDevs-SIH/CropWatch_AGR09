# Field form (one per plot, about 10 minutes)

Print this or copy the answers into `validation/field/observations_template.csv` (one row per plot). Use the **cell id and GPS point from the sample sheet only**. Nobody on the visiting team should know which plots Crop Watch flagged. If you do know, say so on the sheet.

## Before you ask anything (say this in your own words, in Marathi or Hindi if easier)
"We are students testing whether satellite pictures can show crop trouble early. We would like to ask about one plot, this season. We will not write your name or phone number. You can say no, or stop, at any time. We would like to take a photo of the crop or field, not of people. May we?"

Write `yes` in `consent_given` only if they agree. If no, mark the plot `no` and move to the next one on the sheet. Never push.

## Questions

| # | Ask | Column | Notes |
|---|---|---|---|
| 1 | Stand at the GPS point. Is the ground within about 100 m this farmer's plot? | | If not, find the right farmer, or skip |
| 2 | What was grown there this Kharif? | `crop`, `crop_share_pct` | soybean, cotton, tur, other, fallow. If fallow, record and stop |
| 3 | When was it sown? | `sowing_date` | Month and week is enough |
| 4 | Did the crop ever look weak, dry or behind? When did you first notice? | `first_stress_date` | Rough date. Leave empty if never |
| 5 | How bad was it? | `severity_0to3` | 0 none, 1 mild, 2 moderate (clearly less than a normal year), 3 severe or failed |
| 6 | What do you think was the main reason? | `main_cause` | dry_spell, pest_disease, flood_hail, other, none, unknown. Write what they say, even if we disagree |
| 7 | Compared with a normal year, what share of the usual harvest did you get? | `yield_pct_of_normal` | Their estimate |
| 8 | Was it watered by any means besides rain? | `irrigated` | yes, no, partly |
| 9 | Take one clear photo of the crop or field | `photo_file` | File name. No faces. Phone clock must be right, since the date on the photo is useful |
| 10 | Phone GPS accuracy shown on screen | `gps_accuracy_m` | Metres |

Also fill `visit_date`, your initials in `interviewer`, and anything unusual in `notes`.

## Rules that keep the result honest
1. **Visit the plots in the order on the sheet.** If a plot cannot be visited (no access, farmer away, not the right field), write why, and use the next reserve plot **in its listed order**. Do not choose a nicer plot.
2. **Do not pick plots that look interesting.** The sheet was drawn at random.
3. **Record what the farmer says, not what you think.** Severity and cause are theirs.
4. **No names, phone numbers or Aadhaar numbers anywhere.** The plot's cell id is the only identifier.
5. Stressed on the ground means severity 2 or 3, decided **before** looking at our labels.
