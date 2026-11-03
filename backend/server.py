"""Crop Watch: small web service. Logins, role-based access, plot verification, reporting.

Run:  .venv\\Scripts\\python.exe -m uvicorn server:app --port 8100
Results are read from ../data/results (built by build_results.py). The built website in ../frontend/dist
is served at "/". Demo-only: fake accounts, fake plot ownership.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import seed_accounts as seed

ROOT = Path(__file__).resolve().parent.parent
RES, DIST = ROOT / "data" / "results", ROOT / "frontend" / "dist"
DATA = Path(os.environ.get("CW_DATA", ROOT / "data"))   # database, secret and uploads live here (tests point it at a temp folder)
DB = DATA / "cropwatch.db"
TOKEN_HOURS = 12

app = FastAPI(title="Crop Watch")


# ---------- small helpers ----------
def secret() -> bytes:
    p = DATA / "secret.key"
    if os.environ.get("CW_SECRET"):
        return os.environ["CW_SECRET"].encode()
    if not p.exists():
        DATA.mkdir(exist_ok=True)
        p.write_text(secrets.token_hex(32))
    return p.read_text().encode()


def hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1)
    return salt.hex() + "$" + h.hex()


def check_pw(pw: str, stored: str) -> bool:
    salt, h = stored.split("$")
    return hmac.compare_digest(hash_pw(pw, bytes.fromhex(salt)).split("$")[1], h)


def make_token(uid: int) -> str:
    body = base64.urlsafe_b64encode(json.dumps({"u": uid, "e": int(time.time()) + TOKEN_HOURS * 3600}).encode()).decode()
    sig = hmac.new(secret(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def read_token(tok: str):
    try:
        body, sig = tok.split(".")
        if not hmac.compare_digest(hmac.new(secret(), body.encode(), hashlib.sha256).hexdigest(), sig):
            return None
        d = json.loads(base64.urlsafe_b64decode(body))
        return d["u"] if d["e"] > time.time() else None
    except Exception:
        return None


def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c


def audit(who: str, role: str, action: str, detail: str = ""):
    """Append-only record of who did what. Never stores passwords or farmer personal data."""
    c = db()
    c.execute("INSERT INTO audit(at,who,role,action,detail) VALUES(datetime('now'),?,?,?,?)", (who, role, action, detail[:300]))
    c.commit(); c.close()


# ---------- data ----------
PLOTS: dict[str, dict] = {}      # plot id -> feature
TALUKA_GEO: dict[str, dict] = {}


def load_results():
    PLOTS.clear(); TALUKA_GEO.clear()
    for f in RES.glob("taluka_*.geojson"):
        g = json.loads(f.read_text())
        name = g["properties"]["taluka"]
        TALUKA_GEO[name] = g
        for ft in g["features"]:
            PLOTS[ft["properties"]["id"]] = ft


def init_db():
    DATA.mkdir(exist_ok=True)
    c = db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, name TEXT, role TEXT, taluka TEXT, pw TEXT);
    CREATE TABLE IF NOT EXISTS owners(plot_id TEXT, user_id INTEGER);
    CREATE TABLE IF NOT EXISTS checks(id INTEGER PRIMARY KEY, plot_id TEXT, kind TEXT, status TEXT, note TEXT, by_name TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS reports(plot_id TEXT PRIMARY KEY, taluka TEXT, note TEXT, by_name TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, at TEXT, who TEXT, role TEXT, action TEXT, detail TEXT);
    """)
    def add(u, role, taluka=None):
        if not c.execute("SELECT 1 FROM users WHERE email=?", (u["email"],)).fetchone():
            c.execute("INSERT INTO users(email,name,role,taluka,pw) VALUES(?,?,?,?,?)",
                      (u["email"], u["name"], role, taluka, hash_pw(seed.DEMO_PASSWORD)))
    add(seed.ADMIN, "admin")
    add(seed.DISTRICT_OFFICER, "district_officer")
    for t in seed.TALUKA_NAMES:
        add(seed.taluka_account(t), "taluka_officer", t)
    for f in seed.FARMERS:
        add(f, "farmer", f["taluka"])
        uid = c.execute("SELECT id FROM users WHERE email=?", (f["email"],)).fetchone()["id"]
        if not c.execute("SELECT 1 FROM owners WHERE user_id=?", (uid,)).fetchone():
            taken = {r[0] for r in c.execute("SELECT plot_id FROM owners")}
            for want in f["want"]:
                for pid, ft in PLOTS.items():
                    p = ft["properties"]
                    if p["taluka"] == f["taluka"] and p["level"] == want and pid not in taken:
                        c.execute("INSERT INTO owners VALUES(?,?)", (pid, uid)); taken.add(pid); break
    c.commit(); c.close()


@app.on_event("startup")
def startup():
    load_results(); init_db()


# ---------- auth ----------
class Login(BaseModel):
    email: str
    password: str


def current_user(authorization: str = Header(default="")):
    uid = read_token(authorization.removeprefix("Bearer ").strip())
    if uid is None:
        raise HTTPException(401, "Please sign in")
    c = db(); u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone(); c.close()
    if not u:
        raise HTTPException(401, "Please sign in")
    return dict(u)


def public(u):
    return {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"], "taluka": u["taluka"]}


@app.post("/api/auth/login")
def login(b: Login):
    c = db(); u = c.execute("SELECT * FROM users WHERE email=?", (b.email.strip().lower(),)).fetchone(); c.close()
    if not u or not check_pw(b.password, u["pw"]):
        raise HTTPException(401, "Wrong email or password")
    return {"token": make_token(u["id"]), "user": public(dict(u))}


@app.get("/api/audit")
def audit_log(limit: int = 100, u=Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Admins only")
    c = db(); rows = [dict(r) for r in c.execute("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (min(limit, 500),))]; c.close()
    return rows


@app.get("/api/me")
def me(u=Depends(current_user)):
    return public(u)


@app.get("/api/demo-accounts")
def demo_accounts():
    """Fake accounts for the demo sign-in buttons. Switch off with CW_DEMO=0."""
    if os.environ.get("CW_DEMO", "1") == "0":
        return []
    rows = [(seed.DISTRICT_OFFICER, "District officer"), (seed.taluka_account("Partur"), "Taluka officer, Partur"),
            (seed.FARMERS[0], "Farmer (Partur)"), (seed.FARMERS[2], "Farmer 3 (healthy plots)")]
    return [{"label": l, "email": u["email"], "password": seed.DEMO_PASSWORD} for u, l in rows]


@app.get("/api/health")
def health():
    return {"ok": True, "talukas": sorted(TALUKA_GEO), "plots": len(PLOTS)}


# ---------- access ----------
def owned_ids(uid: int) -> set[str]:
    c = db(); r = {x[0] for x in c.execute("SELECT plot_id FROM owners WHERE user_id=?", (uid,))}; c.close()
    return r


def can_see_taluka(u, taluka: str) -> bool:
    return u["role"] in ("admin", "district_officer") or (u["role"] == "taluka_officer" and u["taluka"] == taluka)


def can_see_plot(u, pid: str) -> bool:
    p = PLOTS[pid]["properties"]
    return can_see_taluka(u, p["taluka"]) or (u["role"] == "farmer" and pid in owned_ids(u["id"]))


def status_for(level: str, checks: list, reported: bool) -> str:
    if level in ("normal", "not_farmland"):
        return "none"
    if reported:
        return "reported"
    officer = [c for c in checks if c["kind"] == "officer"]
    latest = (officer or checks or [None])[-1]
    if latest is None:
        return "awaiting_farmer"
    return {"stressed": "confirmed", "fine": "disputed", "not_sure": "unverified"}[latest["status"]]


def all_state():
    c = db()
    checks: dict[str, list] = {}
    for r in c.execute("SELECT * FROM checks ORDER BY id"):
        checks.setdefault(r["plot_id"], []).append(dict(r))
    reports = {r["plot_id"]: dict(r) for r in c.execute("SELECT * FROM reports")}
    c.close()
    return checks, reports


# ---------- views ----------
@app.get("/api/district")
def district(u=Depends(current_user)):
    if u["role"] not in ("district_officer", "admin"):
        raise HTTPException(403, "District officers only")
    d = json.loads((RES / "district.json").read_text())
    _, reports = all_state()
    for t in d["talukas"]:
        t["reported"] = sum(1 for r in reports.values() if r["taluka"] == t["taluka"])
    return d


@app.get("/api/talukas/{name}")
def taluka(name: str, u=Depends(current_user)):
    if name not in TALUKA_GEO:
        raise HTTPException(404, "Unknown taluka")
    if not can_see_taluka(u, name) and u["role"] != "farmer":
        raise HTTPException(403, "Not your taluka")
    mine = owned_ids(u["id"]) if u["role"] == "farmer" else None
    checks, reports = all_state()
    g = TALUKA_GEO[name]
    feats = []
    for ft in g["features"]:
        p = dict(ft["properties"])
        if mine is not None and p["id"] not in mine:
            continue
        p["status"] = status_for(p["level"], checks.get(p["id"], []), p["id"] in reports)
        feats.append({"type": "Feature", "properties": p, "geometry": ft["geometry"]})
    if mine is not None and not feats:
        raise HTTPException(403, "Not your taluka")
    return {"type": "FeatureCollection", "properties": g["properties"], "features": feats}


@app.get("/api/plots/{pid}")
def plot(pid: str, u=Depends(current_user)):
    if pid not in PLOTS or not can_see_plot(u, pid):
        raise HTTPException(404, "No such plot")
    p = dict(PLOTS[pid]["properties"])
    checks, reports = all_state()
    p["checks"] = checks.get(pid, [])
    p["report"] = reports.get(pid)
    p["status"] = status_for(p["level"], p["checks"], pid in reports)
    p["bins"] = [f"{(152 + 10 * b)}" for b in range(16)]
    return p


class Check(BaseModel):
    status: str
    note: str = ""


@app.post("/api/plots/{pid}/checks")
def add_check(pid: str, b: Check, u=Depends(current_user)):
    if b.status not in ("stressed", "fine", "not_sure"):
        raise HTTPException(400, "Status must be stressed, fine or not_sure")
    if pid not in PLOTS or not can_see_plot(u, pid):
        raise HTTPException(404, "No such plot")
    if u["role"] == "farmer":
        kind = "farmer"
    elif u["role"] == "taluka_officer":
        kind = "officer"
    else:
        raise HTTPException(403, "Only farmers and taluka officers record checks")
    c = db()
    c.execute("INSERT INTO checks(plot_id,kind,status,note,by_name,at) VALUES(?,?,?,?,?,datetime('now'))",
              (pid, kind, b.status, b.note[:500], u["name"]))
    c.commit(); c.close()
    audit(u["email"], u["role"], "check", f"{pid} {kind} {b.status}")
    return {"ok": True}


class Report(BaseModel):
    note: str = ""


@app.post("/api/plots/{pid}/report")
def report(pid: str, b: Report, u=Depends(current_user)):
    if u["role"] != "taluka_officer":
        raise HTTPException(403, "Only taluka officers can report a plot")
    if pid not in PLOTS or not can_see_plot(u, pid):
        raise HTTPException(404, "No such plot")
    p = PLOTS[pid]["properties"]
    checks, _ = all_state()
    if p["level"] in ("normal", "not_farmland"):
        raise HTTPException(400, "This plot is not flagged")
    if not any(c["status"] == "stressed" for c in checks.get(pid, [])):
        raise HTTPException(400, "Needs a confirmation (farmer or field visit) before it can be reported")
    c = db()
    c.execute("INSERT OR REPLACE INTO reports VALUES(?,?,?,?,datetime('now'))", (pid, p["taluka"], b.note[:500], u["name"]))
    c.commit(); c.close()
    audit(u["email"], u["role"], "report", pid)
    return {"ok": True}


@app.get("/api/reported")
def reported(u=Depends(current_user)):
    if u["role"] not in ("district_officer", "admin", "taluka_officer"):
        raise HTTPException(403, "Officers only")
    _, reports = all_state()
    rows = [r for r in reports.values() if u["role"] != "taluka_officer" or r["taluka"] == u["taluka"]]
    return rows


# ---------- website ----------
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = DIST / path
        return FileResponse(f if path and f.is_file() else DIST / "index.html")
