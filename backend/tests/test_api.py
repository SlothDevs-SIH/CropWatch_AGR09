"""Access-rule and workflow tests for the Crop Watch service. Run from backend/:  .venv/Scripts/python.exe -m pytest -q"""
import importlib
import json
import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


@pytest.fixture(scope="module")
def client():
    os.environ["CW_DATA"] = tempfile.mkdtemp()     # a throwaway database, never the real one
    import server
    importlib.reload(server)
    with TestClient(server.app) as c:
        yield c


def login(client, email, password="demo1234"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r


def auth(client, email):
    r = login(client, email)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def farmer_plots(client, email="farmer1@partur.demo"):
    h = auth(client, email)
    feats = client.get("/api/talukas/Partur", headers=h).json()["features"]
    return h, [f["properties"]["id"] for f in feats]


def test_wrong_password_and_no_token(client):
    assert login(client, "district@jalna.demo", "nope").status_code == 401
    assert client.get("/api/me").status_code == 401


def test_lockout_after_repeated_failures(client):
    for _ in range(5):
        login(client, "taluka.ambad@jalna.demo", "wrong")
    assert login(client, "taluka.ambad@jalna.demo", "wrong").status_code == 429
    assert login(client, "taluka.ambad@jalna.demo").status_code == 429        # even the right password waits out the window


def test_role_access(client):
    d, t, a = auth(client, "district@jalna.demo"), auth(client, "taluka.partur@jalna.demo"), auth(client, "admin@cropwatch.demo")
    assert client.get("/api/district", headers=d).status_code == 200
    assert client.get("/api/district", headers=t).status_code == 403
    assert client.get("/api/talukas/Jalna", headers=t).status_code == 403          # officer of another taluka
    assert client.get("/api/talukas/Partur", headers=t).status_code == 200
    assert client.get("/api/audit", headers=d).status_code == 403
    assert client.get("/api/audit", headers=a).status_code == 200


def test_farmer_sees_only_own_plots(client):
    h1, mine1 = farmer_plots(client, "farmer1@partur.demo")
    _, mine3 = farmer_plots(client, "farmer3@partur.demo")
    assert mine1 and mine3 and not set(mine1) & set(mine3)
    assert client.get(f"/api/plots/{mine3[0]}", headers=h1).status_code == 404
    assert client.get("/api/talukas/Jalna", headers=h1).status_code == 403


def test_verification_chain(client):
    hf, mine = farmer_plots(client)
    ht = auth(client, "taluka.partur@jalna.demo")
    pid = next(p for p in mine if client.get(f"/api/plots/{p}", headers=hf).json()["level"] in ("urgent", "watch"))
    assert client.post(f"/api/plots/{pid}/report", headers=ht, json={}).status_code == 400          # nothing confirmed yet
    assert client.post(f"/api/plots/{pid}/report", headers=hf, json={}).status_code == 403          # farmers cannot report
    assert client.post(f"/api/plots/{pid}/checks", headers=hf, json={"status": "banana"}).status_code == 400
    assert client.post(f"/api/plots/{pid}/checks", headers=hf, json={"status": "stressed", "note": "dry"}).status_code == 200
    assert client.get(f"/api/plots/{pid}", headers=ht).json()["status"] == "confirmed"
    assert client.post(f"/api/plots/{pid}/report", headers=ht, json={}).status_code == 200
    assert client.get(f"/api/plots/{pid}", headers=ht).json()["status"] == "reported"
    assert any(r["plot_id"] == pid for r in client.get("/api/reported", headers=auth(client, "district@jalna.demo")).json())


def test_photo_checks(client):
    hf, mine = farmer_plots(client)
    pid = mine[0]
    bad = client.post(f"/api/plots/{pid}/photo", headers=hf, files={"file": ("x.png", b"not an image at all", "image/png")})
    assert bad.status_code == 400
    big = client.post(f"/api/plots/{pid}/photo", headers=hf, files={"file": ("x.png", PNG + b"0" * (3 * 1024 * 1024), "image/png")})
    assert big.status_code == 413
    ok = client.post(f"/api/plots/{pid}/photo", headers=hf, files={"file": ("x.png", PNG, "image/png")})
    assert ok.status_code == 200
    photo_id = ok.json()["photo_id"]
    assert client.get(f"/api/photos/{photo_id}", headers=hf).status_code == 200
    other = auth(client, "farmer3@partur.demo")
    assert client.get(f"/api/photos/{photo_id}", headers=other).status_code == 404
    assert client.post(f"/api/plots/{pid}/checks", headers=hf, json={"status": "fine", "photo_id": photo_id}).status_code == 200


def test_evidence_pack_and_orders(client):
    hc = auth(client, "centre@partur.demo")
    _, mine = farmer_plots(client)
    pid = mine[0]
    assert client.get("/api/talukas/Partur", headers=hc).status_code == 403                         # cannot browse the map
    r = client.get(f"/api/plots/{pid}/evidence", headers=hc)
    assert r.status_code == 200 and "does not file a claim" in r.text and "Contains modified Copernicus" in r.text
    assert client.post("/api/orders", headers=hc, json={"plot_id": "PAR-r00c00x"}).status_code == 404
    o = client.post("/api/orders", headers=hc, json={"plot_id": pid})
    assert o.status_code == 200 and o.json()["simulated"] is True
    assert len(client.get("/api/orders", headers=hc).json()) == 1
    assert client.post("/api/orders", headers=auth(client, "farmer1@partur.demo"), json={"plot_id": pid}).status_code == 403
    stats = client.get("/api/admin/stats", headers=auth(client, "admin@cropwatch.demo")).json()
    assert stats["orders"] == 1 and stats["audit"] > 0


def test_rain_and_accuracy_endpoints(client):
    assert client.get("/api/rain/Partur").status_code == 401                    # rainfall needs a sign-in
    r = client.get("/api/rain/Partur", headers=auth(client, "farmer1@partur.demo"))
    assert r.status_code == 200
    d = r.json()
    assert len(d["season_2026_mm"]) == 22 and len(d["average_2018_2025_mm"]) == 22 and sum(d["season_2026_mm"]) > 0
    assert client.get("/api/rain/Nowhere", headers=auth(client, "farmer1@partur.demo")).status_code == 404
    a = client.get("/api/accuracy")                                              # public on purpose
    assert a.status_code == 200 and isinstance(a.json()["measured"], bool)
    if a.json()["measured"]:
        assert a.json()["not_measured"]                                          # what we have NOT measured is always listed


def test_accuracy_picks_up_field_results(client, tmp_path, monkeypatch):
    """Made-up field numbers in a throwaway folder: checks the plumbing only, never the real validation folder."""
    import shutil
    import server
    (tmp_path / "validation" / "field").mkdir(parents=True)
    shutil.copy(Path(server.ROOT) / "validation" / "backtest.json", tmp_path / "validation" / "backtest.json")
    fake = {"n_visits_used": 4, "main": {"n_flagged": 2, "n_unflagged": 2, "share_stressed_if_flagged": 1.0, "range_flagged": [0.34, 1.0],
                                           "share_stressed_if_not_flagged": 0.0, "range_not_flagged": [0.0, 0.66], "kappa": 1.0, "fisher_p": 0.33,
                                           "enough_for_a_significance_claim": False},
            "lead_days_flag_before_farmer_noticed": {"median": None}}
    (tmp_path / "validation" / "field" / "field_result.json").write_text(json.dumps(fake))
    monkeypatch.setattr(server, "ROOT", tmp_path)
    d = client.get("/api/accuracy").json()
    assert d["field_check"]["flagged"]["n"] == 2 and d["field_check"]["enough_for_a_significance_claim"] is False
    assert not any("field" in x.lower() for x in d["not_measured"])
    monkeypatch.undo()
    assert "field_check" not in client.get("/api/accuracy").json()          # no real field file exists, so none is shown
