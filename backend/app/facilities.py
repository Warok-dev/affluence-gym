"""Static facility configuration: ids, display names and opening hours.

Opening hours are local times (config.TIMEZONE), one (open, close) pair per weekday,
0 = Monday ... 6 = Sunday, or None when closed that day.
VALUES TO CHECK against the official schedules before going live.
"""

from dataclasses import dataclass

Hours = tuple[str, str] | None


@dataclass(frozen=True)
class Facility:
    id: str
    name: str
    opening_hours: tuple[Hours, Hours, Hours, Hours, Hours, Hours, Hours]


_WEEK = ("06:30", "23:00")
_WEEKEND = ("08:00", "20:00")

FACILITIES: dict[str, Facility] = {
    f.id: f
    for f in (
        Facility("minto", "Minto", (_WEEK,) * 5 + (_WEEKEND,) * 2),
        Facility("montpetit", "Montpetit", (_WEEK,) * 5 + (_WEEKEND,) * 2),
    )
}
