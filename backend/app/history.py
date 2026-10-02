"""Snapshots, history and the typical-day profile ("best time to go")."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import SNAPSHOT_SECONDS, TIMEZONE
from .db import OccupancySnapshot
from .facilities import FACILITIES
from .sources import OccupancySource

CALM_MAX_LEVEL = 2.0  # average at or below "Calme"
MIN_SAMPLES = 2  # an hour needs at least this many snapshots to be called calm


def take_snapshots(session: Session, source: OccupancySource, now: int) -> int:
    """Record the current level of every facility for the current quarter hour.

    Idempotent: a second call in the same quarter hour is ignored (unique
    constraint), so several workers or a cron + in-process task cannot duplicate rows.
    Facilities without data are skipped: "no report" is not "empty".
    Returns the number of rows written.
    """
    ts = now - now % SNAPSHOT_SECONDS
    written = 0
    for facility in FACILITIES:
        occ = source.current(session, facility, now)
        if occ.level is None:
            continue
        session.add(OccupancySnapshot(facility=facility, ts=ts, level=occ.level, source=source.name))
        try:
            session.commit()
            written += 1
        except IntegrityError:
            session.rollback()
    return written


def history(session: Session, facility: str, days: int, now: int) -> list[OccupancySnapshot]:
    return list(
        session.scalars(
            select(OccupancySnapshot)
            .where(OccupancySnapshot.facility == facility, OccupancySnapshot.ts >= now - days * 86400)
            .order_by(OccupancySnapshot.ts)
        )
    )


@dataclass(frozen=True)
class HourProfile:
    hour: int
    level: float | None  # average level over the sampled weeks
    samples: int
    calm: bool


def opening_hour_range(open_: str, close: str) -> range:
    """Whole hours touched by the opening interval, e.g. 06:30-23:00 -> 6..22."""
    oh, _ = map(int, open_.split(":"))
    ch, cm = map(int, close.split(":"))
    return range(oh, ch + (1 if cm else 0))


def profile(session: Session, facility: str, weekday: int, weeks: int, now: int) -> list[HourProfile]:
    """Average level per hour of `weekday` (local time) over the last `weeks` weeks,
    limited to the opening hours of that day."""
    hours = FACILITIES[facility].opening_hours[weekday]
    if hours is None:
        return []
    buckets: dict[int, list[int]] = {}
    for snap in history(session, facility, weeks * 7, now):
        local = datetime.fromtimestamp(snap.ts, TIMEZONE)
        if local.weekday() == weekday:
            buckets.setdefault(local.hour, []).append(snap.level)
    result = []
    for hour in opening_hour_range(*hours):
        levels = buckets.get(hour, [])
        avg = round(sum(levels) / len(levels), 2) if levels else None
        calm = avg is not None and avg <= CALM_MAX_LEVEL and len(levels) >= MIN_SAMPLES
        result.append(HourProfile(hour=hour, level=avg, samples=len(levels), calm=calm))
    return result
