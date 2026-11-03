# Crop Watch: Backend Plan (the "engine room")

**Written in plain English.** The backend is the part nobody sees. It collects satellite pictures, works out which villages are falling behind normal, keeps the logins and forms, and hands everything to the website.

Version 2, 3 November 2026. This replaces the first version.

---

## 0. Two honest corrections before the plan

1. **"99% of the backend is already trained" is not quite true.** Our GeoAI project is a *change detector*. It already gives us the plumbing: fetch satellite pictures for any box and date, hide clouds, read radar, run jobs, save results as files, serve a website offline. That is a lot, maybe half the work. But it has **no crop-stress logic**. The new parts are: a village-by-village health number each week, a "normal for this crop at this age" curve built from past seasons, the alert levels, logins, field checks and the forms feature.
2. **There is very little "training".** Our comparison with normal is statistics from the past seasons (2017 to 2025), not a big neural network. That is good: it is fast to build, easy to explain to the jury, and cannot be accused of being a black box. The hard part is not training, it is **proving** it works. That proof is the whole pitch.

## 1. What the backend does, in one paragraph

Once a week, for one pilot taluka, it gathers the newest satellite pictures and rainfall, hides clouds, measures crop health in every village, compares each village with what is normal for that crop at that stage of the season, gives each village a level (**Normal, Watch, Urgent, Cannot see**) with a one-line reason and a confidence, and saves the results where the website reads them. It also handles logins, stores field checks, runs the paid "claim help" service (section 7), and produces the accuracy numbers.

## 2. Backend options (same family as GeoAI)

| Option | What it is | Good | Bad | Verdict |
|---|---|---|---|---|
| **A. Files plus a tiny service** | A Python job writes result files (map layers, tables). A small FastAPI service handles logins, field checks and forms. The website reads files. Same as GeoAI. | Reuses our code. Works with no internet at the demo. Few things to break. | Not for thousands of users. | **Pick this** |
| B. Full database with map extension | Everything lives in PostgreSQL/PostGIS and is queried live | Scales to a state | Days of extra work, more to fail on stage | Later |
| C. Hosted backend (Supabase) | Logins and database as a hosted service | Fast logins | Needs internet on stage, needs account and key setup | Only if A's logins slow us down |

**Chosen stack:** Python, the same engine modules as GeoAI (`s2.py`, `aoi.py`, `filters.py`, `radar.py`, `s1.py`), FastAPI for the small service, SQLite for logins, field checks and orders, and results saved as GeoJSON and JSON files. Password hashing and signed login tokens are standard library features, no extra service.

## 3. Choosing the crop: it must be one where stress is really visible

You are right: a vague "maybe you can see it" crop would be a weak pitch. The crop must satisfy five tests.

| Test | Why it matters |
|---|---|
| Big, even canopy that covers the ground | A 10 m satellite pixel is mostly crop, not soil |
| Sharp seasonal curve | A clear green-up and green-down gives a clear "normal" |
| Stress shows within weeks | The signal must come before the official order |
| Few cloudy weeks in the stress window | We need clean pictures |
| A documented bad year to test on | We need a known event, not just our opinion |

| Crop | Verdict |
|---|---|
| **Soybean, Kharif 2026, Marathwada** | **Primary pick.** Drought-declared year with a documented crop loss (about a third lower output as reported). Whole-field canopy droop is large. Drought years have fewer clouds in the dry spells, which helps us. Plots are small (about 1 to 2 hectares) but we score the village, not the plot. |
| Cotton | Second choice. Longer season and patchier canopy, weaker signal early on. |
| Sugarcane | Very visible (big plots, year-round), but drought stress shows slowly and it is not the 2026 event. Good backup if soybean looks weak. |
| Wheat or gram (Rabi) | Clean skies, clear signal, but no declared event of the same size yet. |

### The visibility test (do this FIRST, about one hour)

Before any building: for 3 candidate talukas, draw the soybean greenness curve for 2026 against the average of 2023 to 2025. **Pick the taluka where the 2026 curve sits clearly below normal for weeks and clouds are fewest.** If no taluka shows a clear gap, we say so honestly and switch to the backup crop. This one test protects the whole pitch, because everything else depends on the signal being real.

## 4. Data (all free)

| What | Where from | Used for |
|---|---|---|
| Colour and infrared pictures (Sentinel-2) | Earth Search / Amazon open archive | Greenness and moisture |
| Radar (Sentinel-1) | Planetary Computer or Alaska Satellite Facility | Seeing on cloudy days. **Check first:** one note said the Planetary Computer feed may have stopped adding scenes in April 2026. If so, use Alaska. |
| Rainfall | CHIRPS | Context: was it dry? |
| Farmland mask | ESA WorldCover | Keep only crops |
| Village and taluka outlines | Government or open map data (check the licence before use) | One score per village |
| Official drought list | State order of 25 September 2026 and updates | Our known event |
| State and district outlines | Open map data | The Maharashtra view on the landing page |

## 5. The steps

1. **Fetch** the clearest pictures for each week for the pilot taluka only (a window, never a full tile). Record cloudiness per village.
2. **Clean:** hide clouds and shadows, keep farmland only, align pictures.
3. **Measure** per village per week: greenness, moisture, an early colour signal, and radar strength. Take the middle value of all farmland pixels and record how many we could see.
4. **Learn "normal":** for each village and each week of crop age, the usual value and range from 2017 to 2025. Estimate the sowing date from the first green-up so a late sowing is not flagged as stress.
5. **Decide:** how far below normal, is the gap growing, is it in more than one picture, how much could we see. Then one level, one reason sentence, one confidence.
6. **Baseline:** also run the plain "greener or less green than last week" rule. We must beat it or say we do not.
7. **Save** everything plus a note of the settings used, so it can be repeated by one command.
8. **Serve** (section 6).
9. **Check** against reality (section 8).

Rule: set the Watch and Urgent limits on some seasons and weeks, then **test on others**. Never tune and test on the same data.

## 6. Logins and accounts

Three roles:

| Role | Can do |
|---|---|
| **Officer** (agriculture or revenue office) | See the map, priority list, village pages, record field checks, download lists |
| **Centre operator** (e-Seva or common service centre) | Use the claim help service for farmers who visit |
| **Admin** (our team) | See usage, orders and the accuracy page |

Safety: passwords stored hashed, never in plain text. Sign-in gives a time-limited token. No farmer phone numbers or Aadhaar numbers are kept unless the money feature needs them, and then only with a stated consent (India's DPDP Act, 2023, applies; check with a mentor). For the demo, use clearly fake accounts.

## 7. The money idea: "claim help" through service centres

**Your idea:** farmers must file certain forms at a service centre. The centre charges about ₹80. We charge ₹100 because we collect the data from the centre and deliver it.

**What is good about it:** it gives the project a believable income story, and it puts us where farmers actually go, instead of asking them to download an app.

**What must be checked before we say it on stage (I have not verified any of these):**
1. **Which form exactly?** In Maharashtra the usual centres are Aaple Sarkar Seva Kendras and CSC centres ("e-Seva" is the brand in other states). The likely form is crop-loss intimation or an insurance claim under PMFBY. We must name the real form.
2. **Is it already free?** Crop-loss intimation under PMFBY can usually be done through the national crop insurance app or the helpline for free, within about 72 hours of the event. If it is free, "₹100 to file it" is a hard sell and may look like profiting on a free service.
3. **Fees for government services are usually fixed.** A centre may not be allowed to charge more than the notified fee, and a third party reselling the service could break rules.
4. **Automatically reading or filing on a government portal for others** is usually not allowed without official permission.

**A safer way to build the same idea (recommended for the pitch):** we do not resell the government form. We sell the **evidence pack**. The centre operator opens the farmer's village in Crop Watch and prints or sends a short report: village name, weeks the crops were behind normal, rainfall, dates, and a satellite picture. The farmer attaches it to the claim. We charge a small fee per pack (the exact price comes from testing, not from today). The centre keeps a share. This is a real, new thing we make, it supports a claim, and it avoids the problems above.

**Other buyers, for a stronger business story:** district offices (subscription), insurers and banks (faster, fairer claim checks), seed and input companies (timing of advice).

**Demo rule:** payments in the demo are **simulated with a clear "demo, no real money" label**. We do not show any revenue number, because there is none.

## 8. How we prove it (the numbers behind "we are not lying")

Every number carries its sample size and a margin. Anything not measured says "to be determined".

1. **Known-event check:** for each village in the declared drought area, on what date did we first flag Watch or Urgent, compared with the 25 September order? Report the gap in days, village by village, and what share we flagged at all.
2. **Field-point check:** 20 to 30 dated field observations with photos. How many alerts were confirmed, how many real problems we missed.
3. **Baseline comparison:** us versus the simple greenness drop.
4. **Rainfall check:** do our Urgent villages match the driest spells?
5. **Visibility:** share of village-weeks we could not see.

Promise nothing before measuring. **Do not put "95% accurate" or any figure on a slide until a file produces it.** If the result is modest, show it with the margin. A modest honest number beats a big unprovable one in front of a jury that has seen many inflated claims.

## 9. The service in plain words

| Name | What it does |
|---|---|
| Health check | Says the service is up |
| Sign up / sign in / who am I | Accounts and tokens |
| Map layers | State outline, drought-declared talukas, pilot taluka villages with levels |
| Village detail | Weekly numbers, normal curve, reason, how much we could see |
| Ranked list | "Visit first" with reasons |
| Weeks available | Dates for the date slider |
| Save / list field checks | Stressed, fine or not sure, photo, note, who, when |
| Evidence pack | Build the report for a village and date range (the paid item) |
| Orders | Record a simulated order and the centre's share |
| Accuracy | The measured numbers and limits |
| Export | Ranked list as a spreadsheet, villages as a map file |

**Demo safety rule:** the website must still open from saved files if the service is off. The service only adds logins, field checks and orders.

## 10. What we will NOT build now

No yield forecast. No cause-of-stress diagnosis. No plot-by-plot detection. No big learned model. Only one pilot taluka has village-level results; the rest of Maharashtra on the map shows only coarse context and is labelled "not covered yet". No real payments. No farmer personal data beyond what the evidence pack needs.

## 11. Build phases

| Phase | What | Done when |
|---|---|---|
| 0 | Visibility test, choose taluka and crop | A chart showing a clear gap, names written in `README.md` |
| 1 | Fetch and measure: village table for all weeks | A table of village, week, health, how much seen |
| 2 | Normal curve, levels, reasons, baseline | Every village has a level for every week |
| 3 | Results as files plus tiny service with logins and field checks | The website reads real results |
| 4 | Evidence pack and simulated orders | A pack prints for one village |
| 5 | Validation numbers | Accuracy page numbers come from files |

## 12. Checks before the demo

1. A clear week and a cloudy week both give sensible output, never a blank.
2. A late-sown village is not flagged only for being late.
3. A made-up weak village turns Urgent, a made-up healthy one stays Normal.
4. The baseline and our method run on the same weeks.
5. Turning the service off does not break the website.
6. The accuracy numbers re-create from scratch with one command.
7. Wrong password is refused; a field check cannot be saved without signing in.

## 13. Risks

| Risk | What to do |
|---|---|
| No clear gap in the visibility test | Switch crop or taluka; say so |
| Too many cloudy weeks | Lean on radar and show "cannot see" honestly |
| Results look worse than the baseline | Show them anyway |
| No field points by tomorrow | Use the 2026 drought order as the one known event and say field checks are planned |
| Money idea rejected by the mentors | Fall back to subscriptions for offices and insurers |
| Time runs out | Cut to: one taluka, ranked list, village page, accuracy page |
