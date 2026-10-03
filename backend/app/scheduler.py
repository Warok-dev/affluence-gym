"""In-process periodic tasks: snapshots every quarter hour, quiet-gym alerts, data purge."""

import asyncio
import logging
import time

from . import notifications, retention
from .config import ALERT_CHECK_SECONDS, SNAPSHOT_SECONDS
from .db import SessionLocal
from .forecast.service import forecast_service
from .history import take_snapshots
from .sources import source

log = logging.getLogger(__name__)


def run_once() -> int:
    with SessionLocal() as session:
        written = take_snapshots(session, source, int(time.time()))
        # Retrain the forecast once a day, off the request path.
        forecast_service.get(session)
        return written


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


PURGE_SECONDS = 3600


def purge_once() -> dict[str, int]:
    with SessionLocal() as session:
        return retention.purge(session, int(time.time()))


async def purge_loop() -> None:
    """Every hour, erase the raw inputs past their retention period (app/retention.py)."""
    while True:
        try:
            deleted = await asyncio.to_thread(purge_once)
            if any(deleted.values()):
                log.info("purged: %s", deleted)
        except Exception:  # keep the loop alive whatever happens
            log.exception("purge failed")
        await asyncio.sleep(PURGE_SECONDS)


def check_alerts_once() -> int:
    with SessionLocal() as session:
        return notifications.check_alerts(session, source, int(time.time()), notifications.webpush_sender)


async def alerts_loop() -> None:
    """Every couple of minutes, notify the devices waiting for a quiet gym."""
    while True:
        await asyncio.sleep(ALERT_CHECK_SECONDS)
        if not notifications.enabled():
            continue
        try:
            sent = await asyncio.to_thread(check_alerts_once)
            if sent:
                log.info("quiet-gym notifications sent: %d", sent)
        except Exception:  # keep the loop alive whatever happens
            log.exception("alert check failed")
