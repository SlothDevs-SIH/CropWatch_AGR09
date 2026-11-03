# Crop Watch: Frontend Plan (the website people see)

**Written in plain English.** The frontend is everything on the screen. This version puts the front end first, because the engine mostly reuses what we built before.

Version 2, 3 November 2026. This replaces the first version.

---

## 1. The big idea in one sentence

A visitor lands on a striking page showing **Maharashtra**, sees where the 2026 drought hit, clicks into the pilot district, and the map **flies down to a single village** where the crop stress is plainly visible, with a plain sentence saying why and how sure we are.

## 2. The screens, in the order a visitor meets them

### 2.1 Landing page (the first impression)
Inspired by how the T.R.A.C.E. page opens with a strong headline and a map, but our own design and words.
- **Headline:** something like "Know which villages are falling behind, weeks before the order."
- **Hero:** an animated outline of Maharashtra. The drought-declared talukas glow softly.
- **Three short blocks:** the problem (one line and one number, marked "as reported"), how it works (four steps), what it will not do.
- **Two buttons:** "Open the map" and "Sign in".
- **Honesty strip at the bottom:** "Pilot: one taluka, one season. Accuracy shown on the Accuracy page, measured, with margins."
- Fast, light, no giant file. No stock photos of unrelated things.

### 2.2 Sign in and sign up
- Simple form: email, password. Pick a role at sign-up (Officer or Centre operator). Admin is made by us.
- A visible "demo accounts" note on the demo build, so the jury can sign in.
- After sign-in, officers go to the map; centre operators go to claim help.

### 2.3 Maharashtra map (the zoom journey)
- Starts with the **whole state**. Drought-declared talukas are coloured (this is the official list, not our prediction).
- Click a district. The map **zooms with a smooth flying animation** to that district. Click the pilot taluka. It zooms again to show **villages coloured by level**.
- Click a village and the camera flies in close. A side panel slides in with the village page.
- A breadcrumb at the top (Maharashtra > District > Taluka > Village) and a back button.
- **Only the pilot taluka has village colours.** Everywhere else shows a clear label: "Not covered yet." We never colour places we have no data for.
- A **legend** with level colours and words. A **date slider** at the bottom for weeks.
- Four counters: Urgent, Watch, Normal, Cannot see.

### 2.4 Priority list ("Visit first")
Villages in order, each with level, one-line reason, confidence and last-seen date. Filters: Urgent, Watch, Cannot see, Needs a field check. Search box. Spreadsheet download. Borrowed idea: attention views like "what matters first", "uncertain", "needs verification".

### 2.5 Village page (where stress must be undeniable)
- Big chart: this village versus a shaded normal range for the same crop age, across the season. Cloudy weeks are marked.
- Before/after picture swipe: a healthy week against the stressed week, with the village outline drawn but not filled.
- A plain sentence: "Crops are about three weeks behind a normal season and the gap has grown for two weeks."
- A confidence badge and a "how much we could see" bar.
- Rainfall strip labelled "context, not a cause".
- Field checks already recorded, and the button **Record a field check**.
- Button: **Create evidence pack** (for centre operators, see 2.7).

### 2.6 Field check form
Three big buttons: Stressed, Fine, Not sure. A photo, a note, a name. Works with no internet and sends later.

### 2.7 Claim help (the money feature)
For centre operators and farmers who visit a centre. Details and warnings are in `BACKEND.md` section 7; read them first.
- Search a village, pick dates, preview the **evidence pack** (village, weeks behind normal, rainfall, satellite picture, source and date).
- Print or send it.
- A price and a **"Demo mode, no real money"** label. An orders list for the centre showing the simulated fee and share.
- A clear note: "This pack supports a claim. It does not file the claim and does not guarantee a payout."

### 2.8 Accuracy page
A plain table: alerts confirmed, cases missed, days of warning before the official order, comparison with the simple baseline, share we could not see. Each shows the sample size and margin. Unmeasured items say **"to be determined"**. A short paragraph: what this proves and what it does not. This page is our answer to inflated claims, so make it prominent in the top bar, not buried.

### 2.9 About and limits
How it works in four steps. What it cannot do: cannot say why crops are stressed, cannot see single small plots, cannot predict yield or rain. Data sources and credits (including T.R.A.C.E. and GeoAI as ideas we learned from).

## 3. Look and feel

- Calm, confident, serious. Dark map with bright level colours looks strong on a projector. Keep the four level colours the same everywhere.
- **Never colour alone.** Each level also has a word.
- Big buttons for phones. Text readable at arm's length.
- Smooth but not slow motion: the zoom should take about 1.5 seconds and must be skippable.
- A small badge on every screen: **"Pilot data, one taluka, one season."**
- English first. Marathi if time allows.
- No blank screens. Every screen shows something sensible when data is missing.

## 4. What to borrow from T.R.A.C.E. (ideas, not code)

See `TRACE_NOTES.md`. In short: the landing-then-console flow, attention-based lists, the one-sentence summary on opening, the "uncertain / not observable" counters on the front, the before/after swipe with an outlined (not filled) area, a time strip, an offline field workflow. **We write our own code** because their repository has no licence file.

## 5. What to reuse from GeoAI

The page layout, the map and swipe component, the offline mode, the "every number comes from a file" accuracy pattern, and the tests. The tools are the same: React, a map library (MapLibre), a build tool (Vite), and a service worker for offline.

## 6. How the zoom works (so it is not a surprise)

The map library has a built-in "fly to" move. We store a centre point and zoom level for each district, taluka and village. A click calls "fly to" with those numbers. The village outlines load only when the visitor reaches the taluka level, so the first screen stays light. This is a day of work at most, not a research problem.

## 7. Build order

1. **Map and list with sample data.** Maharashtra, then pilot taluka, then villages coloured.
2. **Landing page.**
3. **Village page.** Chart, reason, confidence, picture swipe.
4. **Sign in and roles.**
5. **Field check form.**
6. **Accuracy and About pages.**
7. **Claim help and evidence pack (simulated).**
8. **Polish:** phone layout, offline, Marathi, animations.

## 8. Checks before the demo

1. Opens and shows the landing page within a few seconds on the presentation laptop.
2. The zoom from state to village works without stutter.
3. It opens with the network off after one visit.
4. A "cannot see" village is clearly grey and says why.
5. Wrong password is refused. Field check needs sign-in.
6. Every number on the Accuracy page is either measured (with sample size) or says "to be determined".
7. No screen claims a cause of stress or a yield figure.
8. The evidence pack says it does not file a claim or guarantee a payout.
9. Someone new understands the map in ten seconds.

## 9. Words to use on screen

| Instead of | Say |
|---|---|
| "Crop disease detected" | "Crops are behind a normal season" |
| "No problem" (when data is missing) | "Cannot see" |
| "Accuracy 95%" | "Not yet measured" until it is |
| "AI prediction" | "Comparison with a normal season" |
| "Guaranteed early warning" | "Early flag, to be confirmed by a visit" |
| "We file your claim" | "A report to attach to your claim" |
