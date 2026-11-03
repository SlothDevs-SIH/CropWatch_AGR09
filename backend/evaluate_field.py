"""Turn field observations into accuracy numbers: how often flagged plots were really stressed, and how often un-flagged ones were too.

  python evaluate_field.py                 reads validation/field/observations.csv and the sealed key, writes field_result.json and FIELD_RESULT.md

Rules, fixed in advance (see docs/FIELD_DATA_PLAN.md):
  * A plot counts as "stressed on the ground" when the farmer-reported severity is 2 or 3 (moderate or severe), whatever the cause.
    A second figure leaves out plots whose main cause was pests, disease, flood or hail.
  * Only visits with consent and a filled severity count. A reserve plot counts only if it was actually visited.
  * With fewer than 20 plots in a group we show the ranges but make no significance claim.
"""
import csv
import hashlib
import json
import math
import statistics
from datetime import date
from pathlib import Path

FIELD = Path(__file__).resolve().parent.parent / "validation" / "field"
NOT_CAUSE_OF_INTEREST = {"pest_disease", "flood_hail"}


def wilson(k, n, z=1.96):
    """95% Wilson score range for k out of n."""
    if n == 0:
        return None
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return round(c - h, 3), round(c + h, 3)


def fisher_p(a, b, c, d):
    """Two-sided Fisher exact p for the 2x2 table [[a, b], [c, d]]."""
    n = a + b + c + d
    r1, c1 = a + b, a + c

    def pr(x):
        return math.comb(r1, x) * math.comb(n - r1, c1 - x) / math.comb(n, c1)
    p0 = pr(a)
    return min(1.0, sum(pr(x) for x in range(max(0, c1 - (n - r1)), min(r1, c1) + 1) if pr(x) <= p0 * (1 + 1e-9)))


def kappa(tp, fp, fn, tn):
    """Cohen's kappa between 'flagged' and 'stressed on the ground'."""
    n = tp + fp + fn + tn
    if n == 0:
        return None
    po = (tp + tn) / n
    pe = ((tp + fp) * (tp + fn) + (fn + tn) * (fp + tn)) / (n * n)
    return None if pe == 1 else round((po - pe) / (1 - pe), 3)


def read_csv(p):
    with open(p, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def to_date(s):
    try:
        return date.fromisoformat(s.strip()[:10])
    except Exception:
        return None


def evaluate(key_path=FIELD / "sample_field_KEY_SEALED.csv", obs_path=FIELD / "observations.csv", meta_path=FIELD / "sample_field_meta.json", blind_path=None):
    key = {r["cell_id"]: r for r in read_csv(key_path)}
    notes = []
    if meta_path and Path(meta_path).exists():
        want = json.loads(Path(meta_path).read_text())["key_sha256"]
        got = hashlib.sha256(Path(key_path).read_bytes()).hexdigest()
        if want != got:
            raise SystemExit("The key file does not match the hash recorded before the visits. Do not use these results.")
        notes.append("Key file matches the hash recorded before the visits.")
    obs = read_csv(obs_path)
    replaces = {}
    if blind_path and Path(blind_path).exists():                         # which main plot each spare stands in for
        replaces = {r["cell_id"]: r["replaces"] for r in read_csv(blind_path) if r.get("replaces")}
    by_id = {o["cell_id"]: o for o in obs}
    yes = ("yes", "y", "true", "1")

    def unusable(o):
        return (o.get("visit_status", "visited").strip().lower() == "not_visited") or o.get("consent_given", "").strip().lower() not in yes

    used, skipped = [], []
    for o in obs:
        k = key.get(o["cell_id"])
        sev = o.get("severity_0to3", "").strip()
        if k is None:
            skipped.append((o["cell_id"], "not in the sample"))
        elif o.get("visit_status", "visited").strip().lower() == "not_visited":
            skipped.append((o["cell_id"], "not visited: " + (o.get("skip_reason", "").strip() or "no reason given")))
        elif o.get("consent_given", "").strip().lower() not in yes:
            skipped.append((o["cell_id"], "no consent recorded"))
        elif sev not in ("0", "1", "2", "3"):
            skipped.append((o["cell_id"], "severity missing"))
        elif k["role"] == "reserve" and replaces and not (replaces.get(o["cell_id"]) in by_id and unusable(by_id[replaces[o["cell_id"]]])):
            skipped.append((o["cell_id"], "spare used although its main plot was not marked unusable"))
        else:
            used.append((o, k))

    def table(rows, drop_causes=False):
        tp = fp = fn = tn = 0
        for o, k in rows:
            if drop_causes and o.get("main_cause", "").strip() in NOT_CAUSE_OF_INTEREST:
                continue
            truth, flagged = int(o["severity_0to3"]) >= 2, k["group"] == "flagged"
            tp += truth and flagged; fp += (not truth) and flagged; fn += truth and (not flagged); tn += (not truth) and (not flagged)
        nf, nu = tp + fp, fn + tn
        out = {"n_flagged": nf, "n_unflagged": nu, "stressed_among_flagged": tp, "stressed_among_unflagged": fn,
               "share_stressed_if_flagged": None if nf == 0 else round(tp / nf, 3), "range_flagged": wilson(tp, nf),
               "share_stressed_if_not_flagged": None if nu == 0 else round(fn / nu, 3), "range_not_flagged": wilson(fn, nu),
               "kappa": kappa(tp, fp, fn, tn)}
        if nf and nu:
            out["fisher_p"] = round(fisher_p(tp, fp, fn, tn), 4)
        out["enough_for_a_significance_claim"] = nf >= 20 and nu >= 20
        return out

    main, no_cause = table(used), table(used, drop_causes=True)
    lead = []
    for o, k in used:
        if k["group"] == "flagged" and int(o["severity_0to3"]) >= 2:
            fs, ff = to_date(o.get("first_stress_date", "")), to_date(k.get("first_flag_date", ""))
            if fs and ff:
                lead.append((fs - ff).days)                      # positive: we flagged earlier than the farmer noticed
    by_taluka = {}
    for o, k in used:
        t = by_taluka.setdefault(k["taluka"], {"n": 0, "stressed": 0})
        t["n"] += 1; t["stressed"] += int(o["severity_0to3"]) >= 2
    result = {"n_visits_used": len(used), "n_skipped": len(skipped), "skipped": skipped, "main": main, "leaving_out_pests_and_floods": no_cause,
              "lead_days_flag_before_farmer_noticed": {"n": len(lead), "median": statistics.median(lead) if lead else None, "values": sorted(lead),
                                                       "caution": "Farmers recall dates from memory, so this is rough."},
              "by_taluka": by_taluka, "notes": notes}
    return result


def write_md(r, path):
    m = r["main"]
    pc = lambda x: "-" if x is None else f"{round(x * 100)}%"
    rg = lambda x: "" if not x else f" (range {round(x[0] * 100)}% to {round(x[1] * 100)}%)"
    lines = [f"# Field check result", "",
             f"Visits used: **{r['n_visits_used']}** (skipped {r['n_skipped']}). {' '.join(r['notes'])}", "",
             "| | Plots | Stressed on the ground | Share |", "|---|---|---|---|",
             f"| Flagged by Crop Watch | {m['n_flagged']} | {m['stressed_among_flagged']} | {pc(m['share_stressed_if_flagged'])}{rg(m['range_flagged'])} |",
             f"| Not flagged | {m['n_unflagged']} | {m['stressed_among_unflagged']} | {pc(m['share_stressed_if_not_flagged'])}{rg(m['range_not_flagged'])} |", "",
             f"Agreement (Cohen's kappa): **{m['kappa']}**. Fisher exact p: **{m.get('fisher_p', '-')}**.", ""]
    if not m["enough_for_a_significance_claim"]:
        lines += ["**Too few plots in at least one group (under 20) to make a significance claim. Read the ranges, not the p value.**", ""]
    n2 = r["leaving_out_pests_and_floods"]
    lines += [f"Leaving out plots whose main cause was pests, disease, flood or hail: flagged {pc(n2['share_stressed_if_flagged'])} (n={n2['n_flagged']}), not flagged {pc(n2['share_stressed_if_not_flagged'])} (n={n2['n_unflagged']}).", ""]
    ld = r["lead_days_flag_before_farmer_noticed"]
    if ld["n"]:
        lines += [f"Lead time: for {ld['n']} confirmed plots, Crop Watch flagged a median of **{ld['median']} days** before the farmer says they noticed (positive is earlier). Farmers recall dates from memory, so this is rough.", ""]
    lines += ["| Taluka | Plots | Stressed |", "|---|---|---|"] + [f"| {t} | {v['n']} | {v['stressed']} |" for t, v in r["by_taluka"].items()]
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    if not (FIELD / "observations.csv").exists():
        raise SystemExit("No observations yet: validation/field/observations.csv does not exist. Nothing to evaluate.")
    r = evaluate(blind_path=FIELD / "sample_field.csv")
    (FIELD / "field_result.json").write_text(json.dumps(r, indent=1))
    write_md(r, FIELD.parent / "FIELD_RESULT.md")
    print(json.dumps({k: r[k] for k in ("n_visits_used", "main")}, indent=1))


if __name__ == "__main__":
    main()
