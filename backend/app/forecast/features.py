"""Feature engineering shared by training, serving and offline evaluation."""

import math
from datetime import date, datetime
from functools import lru_cache

import holidays
import numpy as np

from ..config import TIMEZONE
from ..facilities import FACILITIES

# Exam periods (inclusive), when students' schedules change.
# PROVISIONAL VALUES TO CHECK against the official academic calendar each year.
EXAM_PERIODS: tuple[tuple[date, date], ...] = (
    (date(2026, 4, 11), date(2026, 4, 28)),
    (date(2026, 12, 8), date(2026, 12, 22)),
    (date(2027, 4, 10), date(2027, 4, 28)),
)

FEATURE_NAMES = ("facility", "weekday", "hour", "hour_sin", "hour_cos", "weekend", "holiday", "exam")
FACILITY_INDEX = {fid: i for i, fid in enumerate(FACILITIES)}


@lru_cache(maxsize=1)
def _holidays() -> holidays.HolidayBase:
    # Public holidays of Ontario; the object expands to new years on demand.
    return holidays.Canada(subdiv="ON")


def is_holiday(d: date) -> bool:
    return d in _holidays()


def is_exam(d: date) -> bool:
    return any(start <= d <= end for start, end in EXAM_PERIODS)


def feature_row(facility: str, ts: int) -> list[float]:
    local = datetime.fromtimestamp(ts, TIMEZONE)
    hour = local.hour + local.minute / 60
    angle = 2 * math.pi * hour / 24
    d = local.date()
    return [
        FACILITY_INDEX[facility],
        local.weekday(),
        hour,
        math.sin(angle),
        math.cos(angle),
        float(local.weekday() >= 5),
        float(is_holiday(d)),
        float(is_exam(d)),
    ]


def build_matrix(facilities: list[str], ts: list[int] | np.ndarray) -> np.ndarray:
    return np.array([feature_row(f, int(t)) for f, t in zip(facilities, ts, strict=True)], dtype=float)
