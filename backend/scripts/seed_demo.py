"""Fill a SEPARATE demo database with 16 weeks of fake snapshots, to try the
"typical day" chart and the forecast without waiting for real reports.

Assumptions baked into the fake data: quiet mornings, lunch bump, evening rush,
gentler weekends, and much quieter public holidays (to exercise the holiday feature).

    python scripts/seed_demo.py                      # writes backend/demo.db
    $env:DB_PATH="demo.db"; $env:DEMO_DATA="true"; python -m uvicorn app.main:app --port 8000

DEMO_DATA=true makes the app label every figure as demonstration data.

Never point it at the real database: the values are invented.
"""

import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
os.environ["DB_PATH"] = str(BACKEND / "demo.db")
os.environ.pop("DATABASE_URL", None)
sys.path.insert(0, str(BACKEND))

from sqlalchemy import delete  # noqa: E402

from app.config import SNAPSHOT_SECONDS, TIMEZONE  # noqa: E402
from app.db import OccupancySnapshot, SessionLocal, init_db  # noqa: E402
from app.facilities import FACILITIES  # noqa: E402
from app.forecast.features import is_holiday  # noqa: E402
from app.history import opening_hour_range  # noqa: E402

WEEKS = 16

# Typical busyness (1-4) per hour: quiet mornings, lunch bump, evening rush.
WEEKDAY = {6: 1, 7: 1, 8: 2, 9: 2, 10: 2, 11: 3, 12: 3, 13: 3, 14: 2, 15: 2,
           16: 3, 17: 4, 18: 4, 19: 4, 20: 3, 21: 2, 22: 1}  # fmt: skip
WEEKEND = {8: 1, 9: 1, 10: 2, 11: 2, 12: 3, 13: 3, 14: 3, 15: 2, 16: 2, 17: 2, 18: 1, 19: 1}


def main() -> None:
    rng = random.Random(42)
    init_db()
    now = int(time.time())
    rows = []
    for ts in range(now - WEEKS * 7 * 86400, now, SNAPSHOT_SECONDS):
        ts -= ts % SNAPSHOT_SECONDS
        local = datetime.fromtimestamp(ts, TIMEZONE)
        for fid, facility in FACILITIES.items():
            hours = facility.opening_hours[local.weekday()]
            if hours is None or local.hour not in opening_hour_range(*hours):
                continue
            base = (WEEKDAY if local.weekday() < 5 else WEEKEND).get(local.hour, 1)
            offset = 0 if fid == "minto" else -1 if local.hour in (17, 18) else 0
            holiday = -2 if is_holiday(local.date()) else 0
            level = min(4, max(1, base + offset + holiday + rng.choice((-1, 0, 0, 0, 1))))
            rows.append(OccupancySnapshot(facility=fid, ts=ts, level=level, source="crowd"))
    with SessionLocal() as session:
        session.execute(delete(OccupancySnapshot))
        session.add_all(rows)
        session.commit()
    print(f"{len(rows)} demo snapshots written to {os.environ['DB_PATH']}")


if __name__ == "__main__":
    main()
