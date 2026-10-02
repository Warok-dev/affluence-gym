"""In-process periodic task: one snapshot per facility every quarter hour."""

import asyncio
import logging
import time

from .config import SNAPSHOT_SECONDS
from .db import SessionLocal
from .history import take_snapshots
from .sources import source

log = logging.getLogger(__name__)


def run_once() -> int:
    with SessionLocal() as session:
        return take_snapshots(session, source, int(time.time()))


async def snapshot_loop() -> None:
    while True:
        # Wake up just after each quarter hour (xx:00, xx:15, ...), so the
        # snapshot reflects the 30 minutes leading up to that boundary.
        await asyncio.sleep(SNAPSHOT_SECONDS - time.time() % SNAPSHOT_SECONDS + 1)
        try:
            written = await asyncio.to_thread(run_once)
            log.info("snapshots written: %d", written)
        except Exception:  # keep the loop alive whatever happens
            log.exception("snapshot failed")
