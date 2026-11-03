"""Checks on the picture helpers, with tiny made-up arrays."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from render_imagery import composite, grow, median_composite, stretch, typical_year, year_order


def test_stretch_gives_bright_but_not_clipped_pictures():
    dark = stretch(np.full((2, 2, 3), 0.02, dtype=np.float32))
    mid = stretch(np.full((2, 2, 3), 0.10, dtype=np.float32))
    bright = stretch(np.full((2, 2, 3), 0.40, dtype=np.float32))
    assert dark.dtype == np.uint8 and int(dark.max()) == 0 and int(bright.min()) == 255
    assert 60 < int(mid[0, 0, 0]) < 200                                    # a normal field lands in the middle of the range


def test_composite_fills_cloud_from_the_next_clear_pass():
    a = np.full((2, 3, 3), 0.1, dtype=np.float32); b = np.full((2, 3, 3), 0.2, dtype=np.float32)
    va = np.array([[1, 1, 0], [0, 1, 1]], bool); vb = np.ones((2, 3), bool)
    out, filled = composite([(a, va), (b, vb)])
    assert bool(filled.all())
    assert np.isclose(out[0, 0, 0], 0.1) and np.isclose(out[0, 2, 0], 0.2) and np.isclose(out[1, 0, 0], 0.2)   # first pass wins where it is clear
    out2, filled2 = composite([(a, va)])
    assert not filled2[0, 2] and not filled2[1, 0]                         # a pixel clear in no pass stays unfilled, to be shown grey


def test_typical_year_is_the_one_nearest_the_middle_not_the_best():
    means = {2019: 0.40, 2020: 0.62, 2021: 0.70, 2022: 0.66, 2023: 0.38, 2024: 0.60, 2025: 0.64}
    assert typical_year(means) in (2020, 2022, 2025, 2024)                # close to the median (0.62)
    assert typical_year(means) not in (2021, 2023, 2019)                  # neither the best year nor a drought-like one


def test_grow_widens_a_cloud_mask_by_the_given_number_of_pixels():
    m = np.zeros((9, 9), bool); m[4, 4] = True
    g = grow(m, 2)
    assert g[4, 4] and g[2, 2] and g[6, 6] and not g[1, 1] and not g[4, 7]      # two pixels each way, nothing beyond
    assert grow(m, 0).sum() == 1


def test_median_composite_drops_a_stray_cloud_edge():
    clear = np.full((1, 2, 3), 0.10, dtype=np.float32); stray = np.full((1, 2, 3), 0.50, dtype=np.float32)
    layers = [(clear, np.ones((1, 2), bool)), (clear, np.ones((1, 2), bool)), (stray, np.array([[True, False]]))]
    out, filled = median_composite(layers)
    assert bool(filled.all()) and np.allclose(out[0, 0], 0.10) and np.allclose(out[0, 1], 0.10)   # the bright outlier does not survive
    none, f2 = median_composite([(clear, np.zeros((1, 2), bool))])
    assert not f2.any() and np.allclose(none, 0.10)                      # never clear: marked as such, but shows the least-bad view, not a hole
    hole, f3 = median_composite([(clear, np.zeros((1, 2), bool))], fill_unclear=False)
    assert not f3.any() and np.allclose(hole, 0)


def test_a_dry_year_is_never_chosen_as_the_normal_year():
    means = {2019: 0.55, 2020: 0.60, 2021: 0.62, 2022: 0.61, 2023: 0.60, 2024: 0.63, 2025: 0.59}
    assert typical_year(means, exclude=(2023, 2020)) not in (2023, 2020)
    assert 2023 not in year_order(means, exclude=(2023,))
