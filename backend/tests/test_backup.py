import sqlite3
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backup_db import backup


def test_backup_copies_data_and_keeps_only_the_newest(tmp_path):
    db = sqlite3.connect(tmp_path / "cropwatch.db"); db.execute("CREATE TABLE t(x)"); db.execute("INSERT INTO t VALUES (42)"); db.commit(); db.close()
    made = []
    for _ in range(4):
        made.append(backup(tmp_path, keep=3)); time.sleep(1.1)       # file names carry the second, so wait between copies
    kept = sorted((tmp_path / "backups").glob("cropwatch_*.db"))
    assert len(kept) == 3 and made[0] not in kept                   # the oldest was removed
    assert sqlite3.connect(kept[-1]).execute("SELECT x FROM t").fetchone() == (42,)   # and the copy holds the data
