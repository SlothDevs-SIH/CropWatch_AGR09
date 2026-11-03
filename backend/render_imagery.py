"""Pre-render clear true-colour pictures of each area for the before/after slider.

Run this ahead of time (the website only shows the finished pictures, so nothing renders while presenting).

  python render_imagery.py                 every area with enough past seasons
  python render_imagery.py PartWhole Partur
  python render_imagery.py --force         redo pictures that already exist

For each area it makes two pictures (four with --dates) and a meta.json, in ../data/imagery/<area>/, each extending a little beyond the area so edge plots have surroundings:
  normal  a typical, ordinary past year, mid-September   (not a dry year; the year closest to the middle of the ordinary years)
  now     2026, mid-September                              (default slider: normal year on the left, 2026 on the right, same date)
  aug     2026, mid-August                                  (--dates only)
  late    2026, late September                              (--dates only: secondary slider, the same year on two dates)

Each picture is a clear-sky composite of the clearest satellite passes near its target date. Cloud, cloud shadow and haze are removed
(the satellite's own mask is grown by a few pixels and bright haze is rejected), and the remaining clear pixels from several passes are
blended with a median. A pixel that was never clear shows the least-bad view (meta.json says how much of the picture that is). meta.json records which dates went in and how much is clear.
Source: Copernicus Sentinel-2 L2A (public COG bucket). Contains modified Copernicus Sentinel data.
"""
import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

import numpy as np
from PIL import Image
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds
from shapely.geometry import box as sbox, shape

import s2lite as s2
from analysis import binned_by_year, crop_mask, load_raw
from config import AREAS, TALUKAS, area_spec, sample_spec

OUT = Path(__file__).resolve().parent.parent / "data" / "imagery"
GOOD = (4, 5, 6)                          # scene classification kept: vegetation, bare soil, water
BAD = (0, 1, 3, 7, 8, 9, 10, 11)          # no data, saturated, shadow, unclassified, cloud (medium, high), cirrus, snow
BRIGHT = 0.22                             # blue reflectance above this is cloud or thick haze (white roofs sit below it); thinner haze is handled by the median
GROW = 2                                  # pixels the cloud mask is grown by, to catch cloud edges
TARGET_BINS = slice(9, 12)                # 31 Aug to 29 Sep: three 10-day bins around mid-September, to judge a typical year
FRAMES = {"normal": (258, 15), "now": (258, 15)}                                          # frame: (target day of year, window in days)
EXTRA_FRAMES = {"aug": (227, 20), "late": (271, 15)}                                      # only with --dates: monsoon cloud usually spoils mid-August
MARGIN_M = {"sample_box": 1000, "whole_taluka": 600}                                      # picture extends this far beyond the area, so edge plots have surroundings
MAX_DATES = 5                             # clearest passes (dates) blended into one picture
THREADS = 4                               # kept low so it can run beside the long data downloads
GOOD_ENOUGH = 85.0                        # percent clear at which we stop trying other years for the "normal" picture
PX_M = {"sample_box": 10, "whole_taluka": 20}


# ---------- pure helpers (tested) ----------
def stretch(rgb):
    """Reflectance (0 to about 0.4) to a bright, natural-looking 8-bit picture."""
    x = np.clip((rgb - 0.02) / (0.26 - 0.02), 0, 1) ** 0.85
    return (x * 255).astype(np.uint8)


def grow(mask, n=GROW):
    """Grow a boolean mask by n pixels in every direction."""
    m = mask.copy()
    for _ in range(n):
        p = np.pad(m, 1)
        m = (p[:-2, :-2] | p[:-2, 1:-1] | p[:-2, 2:] | p[1:-1, :-2] | p[1:-1, 1:-1] | p[1:-1, 2:] | p[2:, :-2] | p[2:, 1:-1] | p[2:, 2:])
    return m


def composite(layers):
    """layers: list of (rgb[H,W,3], valid[H,W]) best first. Fill every pixel from the first layer where it is valid. Returns (rgb, filled)."""
    h, w = layers[0][1].shape
    out = np.zeros((h, w, 3), dtype=np.float32)
    filled = np.zeros((h, w), dtype=bool)
    for rgb, valid in layers:
        take = valid & ~filled
        out[take] = rgb[take]
        filled |= take
    return out, filled


def median_composite(layers, fill_unclear=True):
    """Per pixel, the median of the clear values across passes. A single stray cloud edge in one pass cannot survive a median of several.
    Returns (rgb, filled). `filled` marks pixels that were clear in at least one pass. With fill_unclear, pixels that were never clear
    show the median of the unmasked values (the least-bad view) instead of a hole, so towns and edges do not become grey blobs."""
    stack = np.stack([np.where(v[..., None], rgb, np.nan) for rgb, v in layers])
    filled = np.isfinite(stack[..., 0]).any(0)
    with np.errstate(all="ignore"):
        med = np.nanmedian(stack, axis=0)
        if fill_unclear:                                                       # ignore "no data" zeros: they are holes, not dark pixels
            raw = np.stack([np.where(rgb.sum(-1, keepdims=True) > 0, rgb, np.nan) for rgb, _ in layers])
            fallback = np.nan_to_num(np.nanmedian(raw, axis=0), nan=0.12)       # a pixel with no data in any pass becomes neutral grey
        else:
            fallback = 0
    out = np.where(filled[..., None], med, fallback)
    return out.astype(np.float32), filled


def typical_year(means, exclude=()):
    """The year whose value is closest to the median of the allowed years: a typical year, not the best one."""
    allowed = {y: v for y, v in means.items() if y not in exclude} or means
    med = float(np.median(list(allowed.values())))
    return min(allowed, key=lambda y: abs(allowed[y] - med))


def year_order(means, exclude=()):
    """All allowed years, most typical first."""
    allowed = {y: v for y, v in means.items() if y not in exclude} or means
    med = float(np.median(list(allowed.values())))
    return sorted(allowed, key=lambda y: abs(allowed[y] - med))


# ---------- reading ----------
def tiles_for(spec):
    b = spec["bbox"]
    pts = [(b[1], b[0]), (b[1], b[2]), (b[3], b[0]), (b[3], b[2]), ((b[1] + b[3]) / 2, (b[0] + b[2]) / 2)]
    return list(dict.fromkeys(s2.mgrs_tile(a, c) for a, c in pts))


def candidates(spec, year, doy, window):
    """Scenes within `window` days of the target date that touch the area."""
    target = date(year, 1, 1) + timedelta(doy - 1)
    months = sorted({((target + timedelta(d)).year, (target + timedelta(d)).month) for d in range(-window, window + 1)})
    area = sbox(*spec["bbox"])
    out = []
    for t in tiles_for(spec):
        for sc in s2.search(t, months, max_cloud=100.0, bbox_ll=None):
            if abs((sc.date - target).days) <= window and (sc.footprint is None or shape(sc.footprint).buffer(0).intersects(area)):
                out.append(sc)
    return target, out


def read_rgb(sc, bbox, shape_px):
    """True-colour reflectance and a validity mask for one scene over the area. Cloud, shadow and haze are masked and the mask is grown."""
    with s2._open(sc.href("B04")) as ref:
        b = transform_bounds("EPSG:4326", ref.crs, *bbox)

    def rd(band, rs):
        with s2._open(sc.href(band)) as s:
            return s.read(1, window=from_bounds(*b, s.transform), out_shape=shape_px, resampling=rs, boundless=True, fill_value=0).astype(np.float32)
    red, green, blue, scl = rd("B04", Resampling.bilinear), rd("B03", Resampling.bilinear), rd("B02", Resampling.bilinear), rd("SCL", Resampling.nearest)
    off = s2.detect_offset(sc.baseline, red)
    rgb = np.clip((np.stack([red, green, blue], -1) - off) / 10000.0, 0, 1.5)
    bad = np.isin(scl, BAD) | (rgb[..., 2] > BRIGHT) | (red <= 0)
    valid = ~grow(bad) & np.isin(scl, GOOD)
    return rgb, valid


def clear_fraction(sc, bbox, coarse):
    try:
        with s2._open(sc.href("B04")) as ref:
            b = transform_bounds("EPSG:4326", ref.crs, *bbox)
        with s2._open(sc.href("SCL")) as s:
            scl = s.read(1, window=from_bounds(*b, s.transform), out_shape=coarse, resampling=Resampling.nearest, boundless=True, fill_value=0)
        return float(np.isin(scl, GOOD).mean())
    except Exception:
        return 0.0


def render_frame(spec, year, doy, window, shape_px):
    """One picture. Passes are ranked by their tile-wide cloud figure, the most promising are checked over this area, the clearest few are blended."""
    bbox = spec["bbox"]
    target, scenes = candidates(spec, year, doy, window)
    if not scenes:
        return None
    scenes = sorted(scenes, key=lambda sc: sc.cloud_pct)[:10]                 # the ten least cloudy passes by their own metadata
    coarse = (max(8, shape_px[0] // 8), max(8, shape_px[1] // 8))
    with ThreadPoolExecutor(THREADS) as pool:
        fr = list(pool.map(lambda sc: clear_fraction(sc, bbox, coarse), scenes))
    by_date = {}
    for sc, f in zip(scenes, fr):
        by_date.setdefault(sc.date, []).append((sc, f))
    # a date's score: its best scene over this area, plus a little for extra tiles (two tiles on one day cover more of a big area)
    ranked = sorted(by_date.items(), key=lambda kv: -(max(f for _, f in kv[1]) + 0.1 * (len(kv[1]) - 1)))[:MAX_DATES]
    layers, used = [], []
    for d, group in ranked:
        with ThreadPoolExecutor(THREADS) as pool:
            sub = list(pool.map(lambda sc: read_rgb(sc, bbox, shape_px), [sc for sc, _ in group]))
        rgb, filled = composite(sub)                                          # tiles of the same day: fill one with the other
        layers.append((rgb, filled))
        used.append(d)
    out, filled = median_composite(layers)
    out8 = stretch(out)
    meta = {"year": year, "dates": [d.isoformat() for d in sorted(used)], "target": target.isoformat(), "clear_pct": round(float(filled.mean()) * 100, 1)}
    return out8, meta


def typical_years_for(name, spec):
    """Years ranked by how typical their mid-September greenness is, ordinary (non-dry) years only. Returns (ranked years, means)."""
    from backtest import dry_years
    dates, ndvi, _ = load_raw(name)
    by = binned_by_year(dates, ndvi)
    mask = crop_mask(name)
    means = {}
    for y, arr in by.items():
        if y >= 2026:
            continue
        layer = arr[TARGET_BINS]
        if mask is not None:
            layer = np.where(mask[None], layer, np.nan)
        if np.isfinite(layer).sum() > 30:
            means[y] = float(np.nanmean(layer))
    if len(means) < 5:
        return None, means
    return year_order(means, exclude=dry_years(spec["taluka"], sorted(means))), means


def render_area(name, force=False, dates=False):
    spec = area_spec(name) if name in AREAS else sample_spec(name)
    folder = OUT / name
    if (folder / "meta.json").exists() and not force:
        print(f"{name}: already rendered (use --force to redo)")
        return
    try:
        order, means = typical_years_for(name, spec)
    except FileNotFoundError:
        print(f"{name}: no satellite data yet, skipped")
        return
    if order is None:
        print(f"{name}: fewer than five past seasons, skipped")
        return
    px_m = PX_M[spec["kind"]]
    m = MARGIN_M[spec["kind"]]
    w0, s0, e0, n0 = spec["bbox"]
    dlat = m / 111320.0
    dlon = m / (111320.0 * np.cos(np.radians((s0 + n0) / 2)))
    spec = {**spec, "bbox": (w0 - dlon, s0 - dlat, e0 + dlon, n0 + dlat)}                    # the picture covers the area plus a margin
    width = int(round((spec["cols"] * spec["cell_m"] + 2 * m) / px_m))
    height = int(round((spec["rows"] * spec["cell_m"] + 2 * m) / px_m))
    folder.mkdir(parents=True, exist_ok=True)
    frames, t0 = {}, time.time()
    for key, (doy, window) in {**FRAMES, **(EXTRA_FRAMES if dates else {})}.items():
        if key == "normal":                                                   # try the most typical ordinary years until one is clear enough
            best = None
            for year in order[:3]:
                res = render_frame(spec, year, doy, window, (height, width))
                if res and (best is None or res[1]["clear_pct"] > best[1]["clear_pct"]):
                    best = res
                if best and best[1]["clear_pct"] >= GOOD_ENOUGH:
                    break
            res = best
        else:
            res = render_frame(spec, 2026, doy, window, (height, width))
        if res is None:
            print(f"  {name}/{key}: no scenes near the target date")
            continue
        img, meta = res
        Image.fromarray(img).save(folder / f"{key}.jpg", quality=86, optimize=True)
        frames[key] = {**meta, "file": f"{key}.jpg"}
        print(f"  {name}/{key}: {meta['year']}, dates {meta['dates']}, {meta['clear_pct']}% clear")
    if "normal" not in frames or "now" not in frames:
        print(f"{name}: could not make the main pair, not publishing")
        return
    (folder / "meta.json").write_text(json.dumps({
        "area": name, "bbox": list(spec["bbox"]), "width": width, "height": height, "px_m": px_m, "cell_m": spec["cell_m"],
        "typical_year": frames["normal"]["year"], "year_means": {str(k): round(v, 3) for k, v in means.items()}, "frames": frames,
        "rendered": time.strftime("%Y-%m-%d %H:%M"),
        "credit": "Contains modified Copernicus Sentinel data. Clear-sky composites of the clearest passes near each target date."}, indent=1))
    print(f"{name}: done in {time.time() - t0:.0f}s ({width} x {height} px, {px_m} m)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("names", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dates", action="store_true", help="also render mid-August and late September (for Compare dates)")
    a = ap.parse_args()
    for n in a.names or (list(TALUKAS) + list(AREAS)):
        render_area(n, a.force, a.dates)


if __name__ == "__main__":
    main()
