"""Make a safe copy of the Crop Watch database (logins, checks, reports, orders, audit log).

  python backup_db.py              copies data/cropwatch.db to data/backups/cropwatch_<time>.db and keeps the newest 10

Uses SQLite's own backup call, so it is safe while the service is running.
Photos live in data/uploads/ and are not in the database file: copy that folder as well.
"""
import os
import sqlite3
import time
from pathlib import Path

DATA = Path(os.environ.get("CW_DATA", Path(__file__).resolve().parent.parent / "data"))
KEEP = 10


def backup(data=DATA, keep=KEEP):
    src_path = Path(data) / "cropwatch.db"
    if not src_path.exists():
        raise SystemExit(f"No database at {src_path}")
    out_dir = Path(data) / "backups"
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f"cropwatch_{time.strftime('%Y%m%d_%H%M%S')}.db"
    src, dst = sqlite3.connect(src_path), sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close(); dst.close()
    for old in sorted(out_dir.glob("cropwatch_*.db"))[:-keep]:
        old.unlink()
    return dest


if __name__ == "__main__":
    print("saved", backup())
