"""Where the current occupancy comes from (PROJECT.md §8).

The public API only depends on the OccupancySource protocol, so an
OfficialCounterSource (aggregated entries minus exits from the university) can be
added later without touching the routes or the snapshot task.
"""

from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import WINDOW_SECONDS
from .db import Report


@dataclass(frozen=True)
class CurrentOccupancy:
    level: int | None  # 1-4, None when there is no data
    reports: int
    last_report_ts: int | None


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


source: OccupancySource = CrowdSource()
