# What is built, what works, what does not

An honest audit of Crop Watch as of 4 November 2026. "Checked" says exactly how something was verified. Where it says "not checked", it was not.

## How it was checked

- **39 automated tests, all passing:** 9 on the analysis maths, 16 on the web service and its access rules, 8 on the picture renderer, 5 on the field-check evaluator, 1 on database backups. (`backend/tests`, run with `pytest`.)
- **By hand in a real browser** (the app's built-in browser pane, phone-sized and desktop): sign-in as each of the five roles, the district map, the whole-taluka map with the season replay, a plot opened from a link, the farmer screen in English and Marathi, the service-centre and admin screens, and the before/after slider.
- **Speed and size:** whole-taluka maps are 0.2 to 0.3 MB on the wire (3 MB uncompressed) and open in about 2 seconds; the server uses about 190 MB; the server log showed no errors.
- **Not checked at all:** a real phone, the network switched off, a screen reader, other browsers, the Docker image, the Marathi by a native speaker.

## The data

| Piece | State | Notes |
|---|---|---|
| Satellite greenness, 2019 to 2026 | **Works** | Eight 4 km sample boxes, and and all eight whole talukas |
| Rainfall (NASA POWER) | **Works** | Coarse, about 50 km. Two boxes can share a cell |
| Farmland mask (ESA WorldCover) | **Works** | Says cropland, not which crop |
| Taluka outlines | **Works** | Real outlines; all eight boxes checked to lie inside their own taluka |
| Satellite pictures for the slider | **Rendering now** | A few hours of background work; see below |

## The analysis

| Piece | State | Notes |
|---|---|---|
| Levels and reasons per plot | **Works** | Settings tuned on seasons other than 2026, then frozen |
| Crop-age alignment | **Works, small benefit** | The right comparison in principle; the measured gain is small |
| Beats the simple "less green than last reading" rule | **Works** | That rule cannot see this drought at all |
| 2026 stands above every ordinary season | **Works in 8 of 8 whole talukas** | Share at the 25 Sep order vs ordinary max: Mantha 55% (11), Jalna 49% (7), Partur 47% (9), Ghansawangi 44% (7), Ambad 33% (6), Badnapur 28% (14), Bhokardan 24% (20), Jafrabad 11% (10, marginal). Bhokardan and Jafrabad first stand out only after the order |
| Early warning | **Does not work** | The signal first stands out 4 to 14 days **after** the 25 September order |
| Ground truth | **Not done** | No plot has been visited. The field kit is ready |

## The web service

| Piece | State | Checked by |
|---|---|---|
| Sign-in, five roles, lockout, password rules | **Works** | Tests, including a separate-process test of production mode |
| Who can see which plot | **Works** | Tests (wrong role, wrong taluka, wrong farmer all refused) |
| Field checks, photos, reporting rule | **Works** | Tests and browser |
| Evidence pack and simulated orders | **Works** | Tests. No money moves, and it says so |
| Admin: counts, create users, audit log | **Works** | Tests and browser |
| Public accuracy summary | **Works** | Tests; the page reads it |
| Deployment | **Written, not built** | The Docker engine was not running here |

## The website

| Screen | State | Notes |
|---|---|---|
| Landing page | **Works** | Animations checked on phone and desktop width; not tested on a slow laptop or projector |
| District page (real outlines, ranking) | **Works** | Ranks all eight on whole talukas (excess over the usual share for the date): Mantha, Jalna, Ambad, Ghansawangi, Partur, Badnapur, Bhokardan, Jafrabad |
| Whole-taluka map, list, filters | **Works** | About 7,500 to 11,800 cells each, in 3D |
| Season replay slider | **Works** | Recolours week by week, with the 25 September mark. It re-implements the backend rule in the browser, and no test checks the two stay in step |
| Plot panel (chart, rain, photo, history, report) | **Works** | Demo data only |
| Before/after picture slider | **Built, pictures rendering** | "Compare years" is the default; "Compare dates" appears only when both pictures are at least 60% clear |
| Farmer screen | **Works in a browser** | Not tried on a real phone |
| Service-centre and admin screens | **Works** | |
| Marathi | **Works, unreviewed** | Written without a native speaker |
| Offline shell and check queue | **Not verified** | The built-in browser pane cannot register a service worker, so this could not be tested. The code is there |

## Known weaknesses

1. **The headline claim is "where", not "when" and not "correct".** We can show where 2026 differs from ordinary seasons. We cannot show it earlier than the order, and nothing is confirmed on the ground.
2. **The 4 km boxes mislead in both directions** (Partur's too high, Ghansawangi's far too low). Anything quoted from a box should be treated with that in mind.
3. **Cloud limits the pictures.** Mid-August pictures are only 20% to 40% clear. The slider uses mid-September, where cloud is lighter.
4. **Resolution is 10 to 20 m.** You see fields change from green to brown, not crop rows, and a ripened or ploughed field can look like a dried one. The slider shows a pattern, not a cause.
5. **Demo accounts and demo ownership are fake.** Production mode removes them, but nobody has deployed it.

## What to do next, in order

1. Visit plots (the field kit is ready). It is the only thing that turns "different" into "correct".
2. Finish rendering whole-taluka pictures (Partur done; the rest are rendering, about 27 min each; Badnapur whole still needs `render_imagery.py BadnapurWhole`).
3. Test on a real phone, with the network off, in Chrome.
4. Have a Marathi speaker review the text.
5. Build and run the Docker image.
