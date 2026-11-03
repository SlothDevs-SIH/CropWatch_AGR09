# Visibility test result (3 November 2026)

**Question:** is crop stress in 2026 visible in free satellite pictures, compared with 2023 to 2025?
**Method:** one 4 km by 4 km box per site. Every Sentinel-2 scene from June to October, 2023 to 2026. Median greenness (NDVI) of the clear pixels only (clouds, shadow and water removed). Scenes under 50% clear were dropped. Raw numbers: `visibility_raw.csv`. Chart: `visibility_chart.png`. Code: `../backend/visibility_test.py`.

## Result

| Site | Region | Is 2026 visibly below the other years? |
|---|---|---|
| **Jalna** | Marathwada | **Yes, clearly.** From mid-September 2026 sits about 0.15 to 0.25 below 2023 to 2025 (for example 0.42 versus 0.63 in September, 0.31 versus 0.51 in October). |
| **Dharashiv** | Marathwada | **Yes.** About 0.07 to 0.15 lower in September and October. Fewer clear scenes. |
| Latur | Marathwada | **No.** All years look alike. Our box probably covers little soybean. This is a site problem, not proof Latur had no stress. |
| Chiplun, Mangaon, Wada | Konkan | **No.** 2026 follows the normal curve. Konkan also has long cloudy gaps in July and August, so we see it less often. |
| Beed | Marathwada | **Not tested.** Zero scenes: our box sits on the edge of a satellite tile. Needs a second tile. |

## What this means

- **Marathwada is the right region** and Jalna is the strongest candidate so far. Dharashiv is the backup.
- **Konkan is not a good fit.** In this test it shows no drought signal and has more cloud. Its crop (rice, mango) behaves differently, and it normally gets heavy rain. If we want Konkan, the honest story is flood and excess rain, not drought, which is a different project.

## Limits (say these out loud)

1. One box per site, not a whole taluka. The box mixes crops, fallow land and trees, so the numbers show the direction, not the true crop value.
2. A few scenes per month. Some months have no clear picture at all.
3. 2023 was itself a dry year in parts of Maharashtra, so our "normal" is probably a little too low. The real gap may be larger.
4. A low greenness can mean stress, early harvest or sowing date. We cannot say which from this test. This is why the real system compares crops at the same age.
5. This shows the signal exists. It does not measure accuracy.
