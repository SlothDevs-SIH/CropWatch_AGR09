"""Checks for the field evaluator. All data here is made up inside the test and thrown away. No real observation is used or implied."""
import csv
import hashlib
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from evaluate_field import evaluate, fisher_p, kappa, wilson


def test_wilson_matches_known_values():
    lo, hi = wilson(7, 10)
    assert (lo, hi) == (0.397, 0.892)                  # textbook value for 7 out of 10
    assert wilson(0, 0) is None
    lo, hi = wilson(0, 20)
    assert lo == 0.0 and 0.15 < hi < 0.17


def test_fisher_matches_known_value():
    assert round(fisher_p(3, 1, 1, 3), 4) == 0.4857      # classic small table
    assert fisher_p(10, 0, 0, 10) < 0.001
    assert fisher_p(5, 5, 5, 5) == 1.0


def test_kappa_extremes():
    assert kappa(10, 0, 0, 10) == 1.0                    # perfect agreement
    assert kappa(5, 5, 5, 5) == 0.0                      # no better than chance
    assert kappa(0, 10, 10, 0) == -1.0


def write(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields); w.writeheader(); w.writerows(rows)


def test_end_to_end_with_made_up_data(tmp_path):
    kf = ["cell_id", "taluka", "role", "reserve_rank", "group", "level", "deviation", "first_flag_date", "as_of", "lat", "lon"]
    key = [{"cell_id": f"T-{i}", "taluka": "Test", "role": "primary", "reserve_rank": 0, "group": "flagged" if i < 10 else "unflagged",
            "level": "urgent", "deviation": -0.3, "first_flag_date": "2026-09-10", "as_of": "2026-10-29", "lat": 0, "lon": 0} for i in range(20)]
    kp = tmp_path / "key.csv"; write(kp, key, kf)
    meta = tmp_path / "meta.json"; meta.write_text(json.dumps({"key_sha256": hashlib.sha256(kp.read_bytes()).hexdigest()}))
    of = ["cell_id", "consent_given", "severity_0to3", "main_cause", "first_stress_date"]
    obs = []
    for i in range(20):
        flagged = i < 10
        stressed = (i < 8) if flagged else (i >= 18)     # 8 of 10 flagged stressed, 2 of 10 unflagged stressed
        obs.append({"cell_id": f"T-{i}", "consent_given": "yes", "severity_0to3": "3" if stressed else "0",
                    "main_cause": "pest_disease" if i == 0 else "dry_spell", "first_stress_date": "2026-09-20" if stressed else ""})
    obs.append({"cell_id": "T-5", "consent_given": "no", "severity_0to3": "3", "main_cause": "", "first_stress_date": ""})   # no consent: must be skipped
    op = tmp_path / "obs.csv"; write(op, obs, of)
    r = evaluate(kp, op, meta)
    m = r["main"]
    assert (m["n_flagged"], m["n_unflagged"], m["stressed_among_flagged"], m["stressed_among_unflagged"]) == (10, 10, 8, 2)
    assert m["share_stressed_if_flagged"] == 0.8 and m["enough_for_a_significance_claim"] is False       # only 10 per group
    assert r["n_skipped"] == 1 and r["leaving_out_pests_and_floods"]["stressed_among_flagged"] == 7       # the pest case drops out
    assert r["lead_days_flag_before_farmer_noticed"]["median"] == 10                                      # flagged 10 Sep, noticed 20 Sep
    kp.write_text(kp.read_text() + " ")                                                                   # tampering with the key must be refused
    with pytest.raises(SystemExit):
        evaluate(kp, op, meta)
