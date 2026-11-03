# Crop Watch: Who Uses It, What They See, What We Showcase

**Written in plain English.** Pilot locked: **Jalna district, Maharashtra**, soybean, Kharif 2026. Job titles below are my best understanding of Maharashtra's agriculture offices and **must be checked** with an officer or mentor before we print them on a slide.

---

## 1. Two corrections to what we agreed earlier

1. **The place we called "Jalna" in the visibility test was really near Partur.** Our test point (19.60 N, 76.21 E) is Partur taluka, not Jalna town. So the pilot is **Jalna district**, and the strongest signal we have seen is in **Partur taluka**.
2. **"Every plot" needs a plot map we do not have.** Real farm plot outlines (survey or gat numbers) sit in state land-record systems and we have not checked whether we are allowed to use them. Until then, the demo's "plots" are **200 m by 200 m cells** of farmland, labelled "plot-sized cell, not a legal survey plot". The screens and the zoom work the same once real outlines arrive. A satellite pixel is 10 m, so a 200 m cell holds about 400 pixels and gives a stable reading. Very small farms (under 0.3 ha) cannot be read on their own.

## 2. The hierarchy

```
            State / our admin team   (sees everything, no actions on farms)
                      |
          District officer  (one per district: Jalna)
          ranks the talukas, sees which needs most attention
                      |
          Taluka officer  (one per taluka)
          sees every plot in the taluka, verifies, escalates
                      |
                   Farmer  (sees only their own plots)
                   confirms or disputes an alert
```

Optional fifth role (the money idea, see `BACKEND.md` section 7): **Centre operator**, who prints evidence packs for farmers who visit a service centre.

## 3. Who can see and do what

| | Farmer | Taluka officer | District officer | Admin (us) |
|---|---|---|---|---|
| See own plots and their level | Yes | Yes (all in taluka) | Summary only | Yes |
| See every plot in a taluka | No | **Own taluka only** | Any taluka in district | Yes |
| See taluka ranking | No | No | **Yes** | Yes |
| Confirm or dispute an alert on own plot | **Yes** | No | No | No |
| Record a field visit on any plot | No | **Yes** | No | No |
| Mark a plot "reported" (escalate) | No | **Yes** | No | No |
| See reported plots across district | No | Own taluka | **Yes** | Yes |
| Download lists | No | Own taluka | District | Yes |
| Manage accounts | No | No | No | **Yes** |

Rule: every login sees only its own level and below. A taluka officer cannot open another taluka, and a farmer cannot open anyone else's plot.

## 4. The alert journey (your cross-checking idea, made exact)

1. **Satellite flags a plot** as Watch or Urgent (or Cannot see).
2. **Status: "Awaiting farmer".** The farmer sees the alert and is asked: Stressed, Fine, or Not sure, with an optional photo and note.
3. Three outcomes:
   - Farmer says **Stressed** -> **Confirmed**.
   - Farmer says **Fine** -> **Disputed**. The taluka officer decides whether to visit.
   - **No reply** (for the demo, after a set time) -> **Unverified**. The officer visits.
4. **Taluka officer** records a field visit (Stressed / Fine) if needed.
5. If stress is confirmed by the farmer or the visit, the officer can mark the plot **"Reported"**. It then counts in the district's reported list.
6. **District officer** sees reported plots and the ranking.

"Reported" means "we tell the district office, with evidence". It does **not** mean a claim is filed or a payout is made.

## 5. How the district ranking works (your "50%" idea)

For each taluka we calculate: **among farmland cells we could see, what share are Watch or Urgent?** The taluka with the highest share ranks first and the screen says, for example, "Partur: 50% of visible farmland is behind normal."

Honesty rules for the ranking:
- Show **how much we could not see** next to every percentage. A taluka with 70% "Cannot see" must not look healthy or alarming. It is flagged "low confidence".
- Show **Urgent** separately from **Watch**.
- Today each taluka is represented by **one 4 km sample box**, not the whole taluka. The screen says "sample area". The ranking is only as good as that sample. A full-taluka version is the next step.

## 6. What we showcase on the website

**For the jury, in this order:**
1. **Landing page:** the claim in one line, a sign-in button, and an honesty strip ("pilot, measured, with limits").
2. **District officer view:** the ranked list of Jalna's talukas and a map of them coloured by stress share.
3. **Click a taluka:** the map **flies** into it and shows every plot-sized cell coloured by level, with a "visit first" list.
4. **Click a plot:** the camera **swoops** down to it (tilted, rotating), and a panel shows the chart (2026 against the 2023 to 2025 normal), the plain reason, the confidence, and the verification status.
5. **Switch plots:** "next plot" and list clicks fly smoothly from one plot to the next.
6. **Farmer view:** their plots, the alert, and the confirm button.
7. **Accuracy page:** measured numbers with sample sizes, and "to be determined" where we have none.

**What we do not show:** a cause of stress, a yield forecast, any accuracy figure we have not measured, or real farmer names.

## 7. Demo accounts

Fake accounts are created automatically for the demo. Their sign-in details are in `backend/seed_accounts.py`. Farmer ownership of plots is also made up for the demo.

## 8. Words to confirm with an officer

District officer, taluka officer, and the exact office names (for example the taluka agriculture officer and the district superintending agriculture officer). Also confirm whether talukas and districts report up the way we drew it.
