"""Where the current occupancy comes from (PROJECT.md §8).

The public API only depends on the OccupancySource protocol:
- CrowdSource: average of the students' reports (always available);
- OfficialCounterSource: the gym's turnstile counters sent by the university
  (people present = entries - exits, or an estimate from entries alone);
- PreferOfficialSource: the official count while it is fresh, crowd reports otherwise.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import AVERAGE_STAY_SECONDS, LEVEL_RATIOS, OFFICIAL_STALE_SECONDS, TIMEZONE, WINDOW_SECONDS
from .db import OfficialCount, Report
from .facilities import FACILITIES


@dataclass(frozen=True)
class CurrentOccupancy:
    level: int | None  # 1-4, None when there is no data
    reports: int
    last_report_ts: int | None
    source: str = "crowd"
    people: int | None = None  # official source only
    capacity: int | None = None
    estimated: bool = False  # True when computed from entries alone (no exit counter)
    updated_ts: int | None = None  # time of the counter reading


class OccupancySource(Protocol):
    name: str

    def current(self, session: Session, facility: str, now: int) -> CurrentOccupancy: ...


class CrowdSource:
    """Rounded average of the crowd reports of the last 30 minutes."""

    name = "crowd"

    def current(self, session: Session, facility: str, now: int) -> CurrentOccupancy:
        avg_level, n, last_ts = session.execute(
            select(func.avg(Report.level), func.count(), func.max(Report.ts)).where(
                Report.facility == facility, Report.ts >= now - WINDOW_SECONDS
            )
        ).one()
        if n == 0:
            return CurrentOccupancy(level=None, reports=0, last_report_ts=None)
        # Python's round() is banker's rounding (2.5 -> 2), same as the original code.
        return CurrentOccupancy(level=round(float(avg_level)), reports=n, last_report_ts=last_ts)


def level_from_ratio(people: int, capacity: int) -> int:
    ratio = people / capacity
    for level, bound in enumerate(LEVEL_RATIOS, start=1):
        if ratio < bound:
            return level
    return 4


def start_of_local_day(now: int) -> int:
    local = datetime.fromtimestamp(now, TIMEZONE)
    return int(local.replace(hour=0, minute=0, second=0, microsecond=0).timestamp())


class OfficialCounterSource:
    """People present from the turnstile counters (cumulative since local midnight)."""

    name = "official"

    def _reading_at(self, session: Session, facility: str, since: int, at: int) -> OfficialCount | None:
        return session.scalars(
            select(OfficialCount)
            .where(OfficialCount.facility == facility, OfficialCount.ts >= since, OfficialCount.ts <= at)
            .order_by(OfficialCount.ts.desc(), OfficialCount.id.desc())
            .limit(1)
        ).first()

    def current(self, session: Session, facility: str, now: int) -> CurrentOccupancy | None:
        """The official occupancy, or None when there is no fresh reading today."""
        today = start_of_local_day(now)
        latest = self._reading_at(session, facility, today, now)
        if latest is None or now - latest.ts > OFFICIAL_STALE_SECONDS:
            return None
        if latest.exits is not None:
            people, estimated = latest.entries - latest.exits, False
        else:
            # No exit counter: everyone who came in during an average stay is assumed still there.
            earlier = self._reading_at(session, facility, today, now - AVERAGE_STAY_SECONDS)
            people, estimated = latest.entries - (earlier.entries if earlier else 0), True
        people = max(0, people)  # a lagging exit counter must never show negative people
        capacity = FACILITIES[facility].capacity
        return CurrentOccupancy(
            level=level_from_ratio(people, capacity),
            reports=0,
            last_report_ts=None,
            source=self.name,
            people=people,
            capacity=capacity,
            estimated=estimated,
            updated_ts=latest.ts,
        )


class PreferOfficialSource:
    """The official count while it is fresh; crowd reports when the counter is absent or silent."""

    name = "auto"

    def __init__(self) -> None:
        self.official = OfficialCounterSource()
        self.crowd = CrowdSource()

    def current(self, session: Session, facility: str, now: int) -> CurrentOccupancy:
        return self.official.current(session, facility, now) or self.crowd.current(session, facility, now)


source: OccupancySource = PreferOfficialSource()
