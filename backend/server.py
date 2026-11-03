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
import uuid
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import seed_accounts as seed

ROOT = Path(__file__).resolve().parent.parent
RES, DIST = ROOT / "data" / "results", ROOT / "frontend" / "dist"
IMG = ROOT / "data" / "imagery"                          # pre-rendered pictures for the before and after slider (render_imagery.py)
DATA = Path(os.environ.get("CW_DATA", ROOT / "data"))   # database, secret and uploads live here (tests point it at a temp folder)
DB = DATA / "cropwatch.db"
TOKEN_HOURS = 12

@asynccontextmanager
async def lifespan(_app):
    load_results(); init_db()
    yield


app = FastAPI(title="Crop Watch", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)      # map data compresses about eight to one


@app.middleware("http")
async def security_headers(request, call_next):
    r = await call_next(request)
    r.headers.setdefault("X-Content-Type-Options", "nosniff")
    r.headers.setdefault("X-Frame-Options", "DENY")
    r.headers.setdefault("Referrer-Policy", "same-origin")
    r.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")
    return r


# ---------- small helpers ----------
PROD = os.environ.get("CW_ENV") == "production"      # production: no demo accounts, a real secret, an admin made from the environment


def secret() -> bytes:
    p = DATA / "secret.key"
    if os.environ.get("CW_SECRET"):
        return os.environ["CW_SECRET"].encode()
    if PROD:
        raise RuntimeError("CW_SECRET must be set in production. Refusing to invent one.")
    if not p.exists():
        DATA.mkdir(exist_ok=True)
        p.write_text(secrets.token_hex(32))
    return p.read_text().encode()


def check_policy(pw: str):
    """At least 10 characters with a letter and a digit, and not the demo password. Raises a plain-language error."""
    if len(pw) < 10 or not any(c.isalpha() for c in pw) or not any(c.isdigit() for c in pw) or pw == seed.DEMO_PASSWORD:
        raise HTTPException(400, "Password must be at least 10 characters with a letter and a digit, and not a demo password.")


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
PLOTS: dict[str, dict] = {}      # plot id -> {"properties": ...}. Geometry is not kept here; areas are read from disk on demand.
TALUKA_GEO: dict[str, dict] = {}  # area key -> {"properties": summary}
AREA_FILE: dict[str, Path] = {}


def load_results():
    PLOTS.clear(); TALUKA_GEO.clear(); AREA_FILE.clear(); _read_area.cache_clear()
    for f in RES.glob("taluka_*.geojson"):
        g = json.loads(f.read_text())
        name = g["properties"]["taluka"]
        TALUKA_GEO[name] = {"properties": g["properties"]}
        AREA_FILE[name] = f
        for ft in g["features"]:
            PLOTS[ft["properties"]["id"]] = {"properties": ft["properties"]}
        del g                                                    # the big polygons are dropped again; only the small properties stay in memory


@lru_cache(maxsize=2)
def _read_area(name: str) -> dict:
    return json.loads(AREA_FILE[name].read_text())


def init_db():
    DATA.mkdir(exist_ok=True)
    c = db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE, name TEXT, role TEXT, taluka TEXT, pw TEXT);
    CREATE TABLE IF NOT EXISTS owners(plot_id TEXT, user_id INTEGER);
    CREATE TABLE IF NOT EXISTS checks(id INTEGER PRIMARY KEY, plot_id TEXT, kind TEXT, status TEXT, note TEXT, by_name TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS reports(plot_id TEXT PRIMARY KEY, taluka TEXT, note TEXT, by_name TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS photos(id INTEGER PRIMARY KEY, plot_id TEXT, path TEXT, by_name TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, at TEXT, plot_id TEXT, centre TEXT, fee INTEGER, centre_share INTEGER, simulated INTEGER);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, at TEXT, who TEXT, role TEXT, action TEXT, detail TEXT);
    """)
    def add(u, role, taluka=None):
        if not c.execute("SELECT 1 FROM users WHERE email=?", (u["email"],)).fetchone():
            c.execute("INSERT INTO users(email,name,role,taluka,pw) VALUES(?,?,?,?,?)",
                      (u["email"], u["name"], role, taluka, hash_pw(seed.DEMO_PASSWORD)))
    if "photo_id" not in [r["name"] for r in c.execute("PRAGMA table_info(checks)")]:
        c.execute("ALTER TABLE checks ADD COLUMN photo_id INTEGER")      # a check may carry one photo
    if PROD:
        em, pw = os.environ.get("CW_ADMIN_EMAIL", "").strip().lower(), os.environ.get("CW_ADMIN_PASSWORD", "")
        if em and pw and not c.execute("SELECT 1 FROM users WHERE role='admin'").fetchone():
            check_policy(pw)
            c.execute("INSERT INTO users(email,name,role,taluka,pw) VALUES(?,?,?,?,?)", (em, "Administrator", "admin", None, hash_pw(pw)))
        c.commit(); c.close()
        return
    add(seed.ADMIN, "admin")
    add(seed.CENTRE, "centre_operator", "Partur")
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
                    if p["taluka"] == f["taluka"] and p.get("kind", "sample_box") == "sample_box" and p["level"] == want and pid not in taken:
                        c.execute("INSERT INTO owners VALUES(?,?)", (pid, uid)); taken.add(pid); break
    c.commit(); c.close()


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


def home_area(u):
    """Where this user lands: officers open their whole taluka if we have it, farmers their own plots' area."""
    if u["role"] == "taluka_officer":
        whole = [k for k, g in TALUKA_GEO.items() if g["properties"].get("parent_taluka") == u["taluka"] and g["properties"].get("kind") == "whole_taluka"]
        return whole[0] if whole else u["taluka"]
    return u["taluka"] if u["role"] == "farmer" else None


def public(u):
    return {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"], "taluka": u["taluka"], "home_area": home_area(u)}


FAILS: dict[str, list[float]] = {}     # sign-in failures per email and address, newest last
MAX_FAILS, WINDOW = 5, 300             # five wrong passwords in five minutes locks that sign-in for the rest of the window


@app.post("/api/auth/login")
def login(b: Login, request: Request):
    email = b.email.strip().lower()
    key = f"{email}|{request.client.host if request.client else '?'}"
    now = time.time()
    recent = [t for t in FAILS.get(key, []) if now - t < WINDOW]
    if len(recent) >= MAX_FAILS:
        audit(email, "?", "login_locked", key)
        raise HTTPException(429, "Too many wrong attempts. Wait a few minutes and try again.")
    c = db(); u = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone(); c.close()
    if not u or not check_pw(b.password, u["pw"]):
        FAILS[key] = recent + [now]
        audit(email, "?", "login_failed", "")
        raise HTTPException(401, "Wrong email or password")
    FAILS.pop(key, None)
    audit(email, u["role"], "login", "")
    return {"token": make_token(u["id"]), "user": public(dict(u))}


@app.get("/api/audit")
def audit_log(limit: int = 100, u=Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Admins only")
    c = db(); rows = [dict(r) for r in c.execute("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (min(limit, 500),))]; c.close()
    return rows



class ChangePassword(BaseModel):
    old_password: str
    new_password: str


@app.post("/api/auth/change-password")
def change_password(b: ChangePassword, u=Depends(current_user)):
    if not check_pw(b.old_password, u["pw"]):
        audit(u["email"], u["role"], "password_change_failed", "")
        raise HTTPException(401, "Current password is wrong")
    check_policy(b.new_password)
    c = db(); c.execute("UPDATE users SET pw=? WHERE id=?", (hash_pw(b.new_password), u["id"])); c.commit(); c.close()
    audit(u["email"], u["role"], "password_changed", "")
    return {"ok": True}


ROLES = ("farmer", "taluka_officer", "district_officer", "centre_operator")


class NewUser(BaseModel):
    email: str
    name: str
    role: str
    taluka: str | None = None
    password: str


@app.post("/api/admin/users")
def create_user(b: NewUser, u=Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Admins only")
    email = b.email.strip().lower()
    if "@" not in email or b.role not in ROLES:
        raise HTTPException(400, "Give a valid email and one of: " + ", ".join(ROLES))
    if b.role != "district_officer" and (b.taluka not in TALUKA_GEO):
        raise HTTPException(400, "This role needs one of the pilot talukas: " + ", ".join(sorted(TALUKA_GEO)))
    check_policy(b.password)
    c = db()
    if c.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        c.close(); raise HTTPException(409, "That email already has an account")
    c.execute("INSERT INTO users(email,name,role,taluka,pw) VALUES(?,?,?,?,?)", (email, b.name.strip()[:80], b.role, b.taluka, hash_pw(b.password)))
    c.commit(); c.close()
    audit(u["email"], u["role"], "user_created", f"{email} {b.role} {b.taluka}")
    return {"ok": True}


@app.get("/api/me")
def me(u=Depends(current_user)):
    return public(u)


@app.get("/api/demo-accounts")
def demo_accounts():
    """Fake accounts for the demo sign-in buttons. Switch off with CW_DEMO=0."""
    if PROD or os.environ.get("CW_DEMO", "1") == "0":
        return []
    rows = [(seed.DISTRICT_OFFICER, "District officer"), (seed.taluka_account("Partur"), "Taluka officer, Partur"),
            (seed.FARMERS[0], "Farmer (Partur)"), (seed.FARMERS[2], "Farmer 3 (healthy plots)"),
            (seed.CENTRE, "Service centre operator (evidence pack)")]
    return [{"label": l, "email": u["email"], "password": seed.DEMO_PASSWORD} for u, l in rows]


@app.get("/api/rain/{taluka}")
def rain(taluka: str, u=Depends(current_user)):
    """Weekly rainfall this season against the average of 2018 to 2025 (coarse NASA POWER grid). Context, not a cause."""
    if taluka not in TALUKA_GEO:
        raise HTTPException(404, "Unknown taluka")
    taluka = parent_of(taluka)
    from analysis import rain_weekly
    now = rain_weekly(taluka, 2026)
    past = [w for w in (rain_weekly(taluka, y) for y in range(2018, 2026)) if w]
    if now is None or not past:
        raise HTTPException(404, "No rainfall data")
    mean = [round(sum(w[i] for w in past) / len(past), 1) for i in range(22)]
    return {"taluka": taluka, "week_start_doy": [152 + 7 * i for i in range(22)], "season_2026_mm": now, "average_2018_2025_mm": mean,
            "source": "NASA POWER PRECTOTCORR, about 50 km grid"}


def _accuracy_base():
    """What has actually been measured, with sample sizes. Public. Anything not measured is listed as such."""
    p = ROOT / "validation" / "backtest.json"
    if not p.exists():
        return {"measured": False, "message": "Backtest has not been run yet."}
    d = json.loads(p.read_text())
    tuned = d.get("sweep") and next((x for x in d["sweep"] if x["watch"] == d["thresholds"]["watch"] and x["aligned"] == d.get("aligned")), None)
    det = [t["days_before_order"] for t in d["per_taluka"].values()]
    found = [x for x in det if x is not None]
    return {
        "measured": True,
        "seasons_used": d["seasons"],
        "thresholds": d["thresholds"], "crop_age_aligned": d.get("aligned"),
        "false_alarm_in_ordinary_seasons": tuned and {"value": tuned["false_alarm"], "n_taluka_seasons": tuned["n_ordinary"]},
        "flagged_in_dry_seasons": tuned and {"value": tuned["dry_seasons"], "n_taluka_seasons": tuned["n_dry"]},
        "flagged_in_2026_test_season": tuned and tuned["test_2026"],
        "dry_season_definition": d.get("dry_definition"),
        "detection": {"talukas_with_detection": len(found), "talukas_total": len(det),
                      "days_before_order": sorted(found), "order_date": "2026-09-25",
                      "note": "Negative means the signal appeared after the order. Each taluka is one 4 km sample box."},
        "simple_baseline": d.get("simple_baseline") and {
            "rule": d["simple_baseline"]["rule"], "false_alarm_in_ordinary_seasons": d["simple_baseline"]["false_alarm"],
            "flagged_in_2026_test_season": d["simple_baseline"]["test_2026"],
            "days_before_order": sorted(x for x in d["simple_baseline"]["days_before_order"].values() if x is not None)},
        "not_measured": ["Agreement with farmer or field observations (none collected yet)",
                         "Taluka-by-taluka match with the official drought list (list not obtained)"],
    }


@app.get("/api/accuracy")
def accuracy():
    """Public. The backtest numbers, plus the field-check numbers once validation/field/field_result.json exists."""
    out = _accuracy_base()
    checks = []
    for f in sorted((ROOT / "validation").glob("backtest_area_*.json")):          # whole-taluka checks against their 4 km sample boxes
        a = json.loads(f.read_text())
        w, b = a["share_at_order_date"]["whole_taluka"], a["share_at_order_date"]["sample_box"]
        ordinary = [v for y, v in w.items() if y != "2026" and v is not None]
        checks.append({"taluka": a["taluka"], "farmland_cells": a["cells"], "flagged_2026": w.get("2026"), "ordinary_min": min(ordinary), "ordinary_max": max(ordinary),
                       "sample_box_2026": b.get("2026"), "days_before_order": a["detection_days_before_order"]["whole_taluka"]})
    if out.get("measured") and checks:
        out["whole_taluka_check"] = checks
    fp = ROOT / "validation" / "field" / "field_result.json"
    if out.get("measured") and fp.exists():
        r = json.loads(fp.read_text())
        m = r["main"]
        out["field_check"] = {"plots_visited": r["n_visits_used"], "flagged": {"n": m["n_flagged"], "share_stressed": m["share_stressed_if_flagged"], "range": m["range_flagged"]},
                              "not_flagged": {"n": m["n_unflagged"], "share_stressed": m["share_stressed_if_not_flagged"], "range": m["range_not_flagged"]},
                              "kappa": m["kappa"], "fisher_p": m.get("fisher_p"), "enough_for_a_significance_claim": m["enough_for_a_significance_claim"],
                              "lead_days": r["lead_days_flag_before_farmer_noticed"]["median"]}
        out["not_measured"] = [x for x in out.get("not_measured", []) if "field" not in x.lower()]
    return out


@app.get("/api/health")
def health():
    return {"ok": True, "talukas": sorted(TALUKA_GEO), "plots": len(PLOTS)}


# ---------- access ----------
def owned_ids(uid: int) -> set[str]:
    c = db(); r = {x[0] for x in c.execute("SELECT plot_id FROM owners WHERE user_id=?", (uid,))}; c.close()
    return r


def parent_of(name: str) -> str:
    """A whole-taluka area (for example PartWhole) belongs to its parent taluka for access purposes."""
    return TALUKA_GEO[name]["properties"].get("parent_taluka", name) if name in TALUKA_GEO else name


def can_see_taluka(u, taluka: str) -> bool:
    taluka = parent_of(taluka)
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
        t["reported"] = sum(1 for r in reports.values() if r["taluka"] == t.get("parent_taluka", t["taluka"]))
    return d


HEAVY = ("series_2026", "series_normal", "reason")


def _visible_features(name: str, u):
    """Features of an area this user may see, with their verification status. Farmers get only their own plots."""
    if name not in TALUKA_GEO:
        raise HTTPException(404, "Unknown taluka")
    if not can_see_taluka(u, name) and u["role"] != "farmer":
        raise HTTPException(403, "Not your taluka")
    mine = owned_ids(u["id"]) if u["role"] == "farmer" else None
    g = _read_area(name)
    feats = [ft for ft in g["features"] if mine is None or ft["properties"]["id"] in mine]
    if mine is not None and not feats:
        raise HTTPException(403, "Not your taluka")
    return g, feats


@app.get("/api/talukas/{name}")
def taluka(name: str, u=Depends(current_user)):
    g, feats = _visible_features(name, u)
    checks, reports = all_state()
    out = []
    for ft in feats:
        p = {k: v for k, v in ft["properties"].items() if k not in HEAVY}          # the plot panel asks for the detail of one plot
        p["status"] = status_for(p["level"], checks.get(p["id"], []), p["id"] in reports)
        out.append({"type": "Feature", "properties": p, "geometry": ft["geometry"]})
    return {"type": "FeatureCollection", "properties": g["properties"], "features": out}


@app.get("/api/talukas/{name}/series")
def taluka_series(name: str, u=Depends(current_user)):
    """Per-plot greenness this season and the normal for the same crop age, in thousandths, so the website can replay the season."""
    g, feats = _visible_features(name, u)
    q = lambda arr: [None if v is None else round(v * 1000) for v in arr]
    ids, now, normal = [], [], []
    for ft in feats:
        p = ft["properties"]
        if p.get("series_2026"):
            ids.append(p["id"]); now.append(q(p["series_2026"])); normal.append(q(p["series_normal"]))
    return {"bins_start_doy": [152 + 10 * b for b in range(16)], "ids": ids, "now": now, "normal": normal, "unit": "thousandths of greenness (NDVI)"}


@app.get("/api/imagery/{area}")
def imagery(area: str, u=Depends(current_user)):
    """Describes the pre-rendered pictures of an area. The images themselves are static files under /imagery/<area>/."""
    if area not in TALUKA_GEO:
        raise HTTPException(404, "Unknown area")
    f = IMG / area / "meta.json"
    if not f.exists():
        raise HTTPException(404, "Pictures for this area have not been rendered yet")
    return json.loads(f.read_text())


@app.get("/api/areas")
def areas(u=Depends(current_user)):
    """The areas this user can open: sample boxes and whole-taluka areas, with what each covers."""
    out = []
    for key, g in sorted(TALUKA_GEO.items()):
        p = g["properties"]
        if u["role"] in ("admin", "district_officer") or (u["role"] == "taluka_officer" and p.get("parent_taluka", key) == u["taluka"]):
            out.append({"key": key, "parent": p.get("parent_taluka", key), "kind": p.get("kind", "sample_box"), "cell_m": p.get("cell_m", 200),
                        "farmland_cells": p["farmland_cells"], "as_of": p["as_of"], "centre": p["centre"]})
    return out


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
    g = TALUKA_GEO.get(p.get("area", ""), {}).get("properties")
    if g:                                                           # where this plot sits, so the picture slider can centre on it
        w, so, e, n = g["bbox"]
        p["centre"] = [round(w + (p["col"] + 0.5) * (e - w) / g["cols"], 6), round(n - (p["row"] + 0.5) * (n - so) / g["rows"], 6)]
        p["cell_m"] = g.get("cell_m", 200)
    return p


class Check(BaseModel):
    status: str
    note: str = ""
    photo_id: int | None = None


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
    if b.photo_id is not None and not c.execute("SELECT 1 FROM photos WHERE id=? AND plot_id=?", (b.photo_id, pid)).fetchone():
        c.close(); raise HTTPException(400, "That photo does not belong to this plot")
    c.execute("INSERT INTO checks(plot_id,kind,status,note,by_name,at,photo_id) VALUES(?,?,?,?,?,datetime('now'),?)",
              (pid, kind, b.status, b.note[:500], u["name"], b.photo_id))
    c.commit(); c.close()
    audit(u["email"], u["role"], "check", f"{pid} {kind} {b.status}")
    return {"ok": True}


MAX_PHOTO = 3 * 1024 * 1024


def photo_ext(head: bytes) -> str | None:
    """Trust the file's first bytes, not the name or the declared type."""
    if head.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    return None


@app.post("/api/plots/{pid}/photo")
async def upload_photo(pid: str, file: UploadFile = File(...), u=Depends(current_user)):
    if u["role"] not in ("farmer", "taluka_officer"):
        raise HTTPException(403, "Only farmers and taluka officers add photos")
    if pid not in PLOTS or not can_see_plot(u, pid):
        raise HTTPException(404, "No such plot")
    data = await file.read(MAX_PHOTO + 1)
    if len(data) > MAX_PHOTO:
        raise HTTPException(413, "Photo is larger than 3 MB")
    ext = photo_ext(data[:16])
    if not ext:
        raise HTTPException(400, "Photo must be a JPEG, PNG or WebP image")
    folder = DATA / "uploads" / pid
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uuid.uuid4().hex}.{ext}"
    path.write_bytes(data)
    c = db()
    cur = c.execute("INSERT INTO photos(plot_id,path,by_name,at) VALUES(?,?,?,datetime('now'))", (pid, str(path), u["name"]))
    c.commit(); pid_new = cur.lastrowid; c.close()
    audit(u["email"], u["role"], "photo", f"{pid} {len(data)} bytes")
    return {"photo_id": pid_new}


@app.get("/api/photos/{photo_id}")
def get_photo(photo_id: int, u=Depends(current_user)):
    c = db(); r = c.execute("SELECT * FROM photos WHERE id=?", (photo_id,)).fetchone(); c.close()
    if not r or not can_see_plot(u, r["plot_id"]):
        raise HTTPException(404, "No such photo")
    return FileResponse(r["path"])


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
    rows = [dict(r, area=PLOTS.get(r["plot_id"], {"properties": {}})["properties"].get("area")) for r in reports.values()
            if u["role"] != "taluka_officer" or r["taluka"] == u["taluka"]]
    return rows



# ---------- evidence pack (a report that supports a claim; it does not file one) ----------
DEMO_FEE, CENTRE_SHARE = 100, 20      # simulated rupees, set only for the demo. Real pricing comes from testing, not from this file.


def can_evidence(u, pid: str) -> bool:
    p = PLOTS[pid]["properties"]
    if u["role"] == "centre_operator":
        return u["taluka"] == p["taluka"]          # looks a plot up by its id for a farmer who is present; cannot browse the map
    return can_see_plot(u, pid)


def chart_svg(series, normal, w=520, h=220):
    L, R, T, B = 36, 10, 10, 26
    xs = lambda i: L + i * (w - L - R) / (len(series) - 1)
    ys = lambda v: T + (1 - min(max(v, 0), 0.9) / 0.9) * (h - T - B)

    def path(arr):
        d, pen = "", False
        for i, v in enumerate(arr):
            if v is None:
                pen = False
                continue
            d += f"{'L' if pen else 'M'}{xs(i):.1f},{ys(v):.1f}"
            pen = True
        return d
    grid = "".join(f'<line x1="{L}" x2="{w - R}" y1="{ys(v):.1f}" y2="{ys(v):.1f}" stroke="#ddd"/><text x="{L - 6}" y="{ys(v) + 4:.1f}" font-size="10" text-anchor="end" fill="#666">{v:.1f}</text>' for v in (0, 0.3, 0.6, 0.9))
    return (f'<svg viewBox="0 0 {w} {h}" width="100%">{grid}<path d="{path(normal)}" fill="none" stroke="#777" stroke-width="2" stroke-dasharray="5 4"/>'
            f'<path d="{path(series)}" fill="none" stroke="#b8341f" stroke-width="2.6"/></svg>')


@app.get("/api/plots/{pid}/evidence", response_class=HTMLResponse)
def evidence(pid: str, u=Depends(current_user)):
    if pid not in PLOTS or not can_evidence(u, pid):
        raise HTTPException(404, "No such plot")
    p = PLOTS[pid]["properties"]
    g = TALUKA_GEO[p["taluka"]]["properties"]
    checks, reports = all_state()
    ch = checks.get(pid, [])
    status = status_for(p["level"], ch, pid in reports)
    from analysis import doy, rain_total
    upto = doy(g["as_of"])
    rain_now = rain_total(p["taluka"], 2026, upto)
    past = [r for r in (rain_total(p["taluka"], y, upto) for y in range(2018, 2026)) if r is not None]
    rain_line = (f"Rain from 1 June to {g['as_of']}: {rain_now} mm this season, against an average of {sum(past) / len(past):.0f} mm in 2018 to 2025 "
                 f"(coarse gridded estimate, about 50 km, not a gauge reading).") if rain_now is not None and past else "Rainfall data not available."
    rows = "".join(f"<tr><td>{c['at']}</td><td>{'Farmer' if c['kind'] == 'farmer' else 'Field visit'}</td><td>{c['status'].replace('_', ' ')}</td><td>{c['note'] or ''}</td></tr>" for c in ch) or '<tr><td colspan="4">No farmer or field checks recorded yet.</td></tr>'
    chart = chart_svg(p["series_2026"], p["series_normal"]) if p.get("series_2026") else ""
    html = f"""<!doctype html><html lang="en"><meta charset="utf-8"><title>Crop Watch evidence pack {pid}</title>
<style>body{{font-family:Segoe UI,Arial,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#1e2620}}h1{{font-size:1.5rem}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ccc;padding:6px 8px;font-size:.9rem;text-align:left}}.box{{border:1px solid #b9b19c;background:#f6f1e4;padding:10px 14px;border-radius:8px;margin:1rem 0;font-size:.92rem}}small{{color:#555}}</style>
<h1>Crop Watch evidence pack</h1>
<p><b>Plot-sized cell {pid}</b>, {p['taluka']} taluka, Jalna district. Satellite readings to {g['as_of']}.</p>
<div class="box"><b>Satellite finding:</b> {p['level'].replace('_', ' ')} ({p.get('confidence', 'n/a')} confidence). {p.get('reason', '')}<br><b>Verification status:</b> {status.replace('_', ' ') if status != 'none' else 'not flagged'}.</div>
<h3>Greenness this season against the 2018 to 2025 average for the same time of year</h3>
{chart}<small>Red: this season. Dashed grey: the average of past seasons. Gaps are weeks with no clear satellite picture.</small>
<h3>Rainfall</h3><p>{rain_line}</p>
<h3>Checks recorded</h3><table><tr><th>When</th><th>By</th><th>Result</th><th>Note</th></tr>{rows}</table>
<div class="box"><b>Please read.</b> This report compares satellite pictures with earlier seasons. It does not say why a crop is behind, does not estimate yield, does not file a claim and does not promise any payout. A plot-sized cell is a 200 m by 200 m square, not a legal survey plot. Contains modified Copernicus Sentinel data; rainfall from NASA POWER; farmland mask from ESA WorldCover.</div>
<small>Generated {time.strftime('%Y-%m-%d %H:%M')} by Crop Watch (pilot).</small></html>"""
    audit(u["email"], u["role"], "evidence", pid)
    return HTMLResponse(html)


class Order(BaseModel):
    plot_id: str


@app.post("/api/orders")
def create_order(b: Order, u=Depends(current_user)):
    """Simulated purchase of an evidence pack. No money moves. Recorded so the flow and the revenue split can be shown."""
    if u["role"] != "centre_operator":
        raise HTTPException(403, "Only service centre operators place orders")
    if b.plot_id not in PLOTS or not can_evidence(u, b.plot_id):
        raise HTTPException(404, "No such plot")
    c = db()
    cur = c.execute("INSERT INTO orders(at,plot_id,centre,fee,centre_share,simulated) VALUES(datetime('now'),?,?,?,?,1)",
                    (b.plot_id, u["email"], DEMO_FEE, CENTRE_SHARE))
    c.commit(); oid = cur.lastrowid; c.close()
    audit(u["email"], u["role"], "order", f"{b.plot_id} simulated")
    return {"order_id": oid, "simulated": True, "fee": DEMO_FEE, "centre_share": CENTRE_SHARE, "evidence_url": f"/api/plots/{b.plot_id}/evidence"}


@app.get("/api/orders")
def list_orders(u=Depends(current_user)):
    if u["role"] not in ("centre_operator", "admin"):
        raise HTTPException(403, "Not allowed")
    c = db()
    rows = [dict(r) for r in c.execute("SELECT * FROM orders" + (" WHERE centre=?" if u["role"] == "centre_operator" else "") + " ORDER BY id DESC",
                                       (u["email"],) if u["role"] == "centre_operator" else ())]
    c.close()
    return rows


@app.get("/api/admin/stats")
def admin_stats(u=Depends(current_user)):
    if u["role"] != "admin":
        raise HTTPException(403, "Admins only")
    c = db()
    out = {t: c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("users", "checks", "reports", "photos", "orders", "audit")}
    c.close()
    return out


# ---------- pictures (open Sentinel-2 data, so no sign-in is needed for the image files) ----------
IMG.mkdir(parents=True, exist_ok=True)
app.mount("/imagery", StaticFiles(directory=IMG), name="imagery")


# ---------- website ----------
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = DIST / path
        return FileResponse(f if path and f.is_file() else DIST / "index.html")
