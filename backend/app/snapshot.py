"""Take one snapshot now, e.g. from an external cron: `python -m app.snapshot`."""

from .db import init_db
from .scheduler import run_once

if __name__ == "__main__":
    init_db()
    print(f"snapshots written: {run_once()}")
