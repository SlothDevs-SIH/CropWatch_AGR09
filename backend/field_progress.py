"""Evening check for the field team. Blind-safe: it reads only the public sample list and your observations, never the sealed key.

  python field_progress.py            (reads validation/field/observations.csv)

Tells you: how many main plots are done per taluka, which spares are allowed, and which rows are incomplete or odd.
"""
import csv
from collections import Counter
from pathlib import Path

FIELD = Path(__file__).resolve().parent.parent / "validation" / "field"
YES = ("yes", "y", "true", "1")


def read(p):
    with open(p, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main():
    sample = read(FIELD / "sample_field.csv")
    obs_path = FIELD / "observations.csv"
    if not obs_path.exists():
        raise SystemExit("No observations.csv yet. Export the CSV from the phone page and save it as validation/field/observations.csv.")
    obs = read(obs_path)
    by = {}
    problems = []
    for o in obs:
        if o["cell_id"] in by:
            problems.append(f"{o['cell_id']}: appears twice")
        by[o["cell_id"]] = o
    ids = {r["cell_id"] for r in sample}
    for cid in by:
        if cid not in ids:
            problems.append(f"{cid}: not in the sample")

    def state(o):
        if o is None:
            return "todo"
        if o.get("visit_status", "visited").strip().lower() == "not_visited":
            return "not_visited"
        if o.get("consent_given", "").strip().lower() not in YES:
            return "no_consent"
        return "done"

    rows = []
    for t in sorted({r["taluka"] for r in sample}):
        prim = [r for r in sample if r["taluka"] == t and r["role"] == "primary"]
        c = Counter(state(by.get(r["cell_id"])) for r in prim)
        rows.append((t, len(prim), c["done"], c["not_visited"], c["no_consent"], c["todo"]))
    print(f"{'Taluka':<14}{'main':>5}{'done':>6}{'not visited':>13}{'no consent':>12}{'to do':>7}")
    for r in rows:
        print(f"{r[0]:<14}{r[1]:>5}{r[2]:>6}{r[3]:>13}{r[4]:>12}{r[5]:>7}")
    total = sum(r[1] for r in rows)
    done = sum(r[2] for r in rows)
    print(f"\nMain plots done: {done} of {total}.")

    allowed = []                                                   # spares you may now use, because their main plot is out
    for r in sample:
        if r["role"] == "reserve":
            if state(by.get(r["replaces"])) in ("not_visited", "no_consent"):
                allowed.append(f"{r['cell_id']} (instead of {r['replaces']})" + ("  [already " + state(by.get(r["cell_id"])) + "]" if r["cell_id"] in by else ""))
            elif r["cell_id"] in by:
                problems.append(f"{r['cell_id']}: spare entered but its main plot {r['replaces']} was not marked unusable. It will not count")
    print("Spares you may use now:", "; ".join(allowed) if allowed else "none")

    for cid, o in by.items():
        if state(o) != "done":
            continue
        miss = [k for k in ("visit_date", "interviewer", "crop", "severity_0to3") if not o.get(k, "").strip()]
        if o.get("severity_0to3", "").strip() not in ("0", "1", "2", "3"):
            problems.append(f"{cid}: severity must be 0, 1, 2 or 3")
        elif o.get("crop", "").strip() != "fallow":
            miss += [k for k in ("main_cause", "photo_file") if not o.get(k, "").strip()]
        if miss:
            problems.append(f"{cid}: missing {', '.join(sorted(set(miss)))}")
        photos = FIELD / "photos"
        if photos.exists() and o.get("photo_file", "").strip() and not (photos / o["photo_file"].strip()).exists():
            problems.append(f"{cid}: photo {o['photo_file']} not found in validation/field/photos/")
    print(f"\n{len(problems)} thing(s) to fix:" if problems else "\nNothing to fix.")
    for p in problems:
        print("  -", p)
    left = total - done
    if left:
        print(f"\nStill {left} main plot(s) open (some may be replaced by spares).")
    else:
        print("\nAll main plots done. Next: second person scores 10 photos, then run evaluate_field.py.")


if __name__ == "__main__":
    main()
