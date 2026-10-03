"""Data minimisation: raw inputs are erased once they no longer serve any purpose.

- Crowd reports carry a random device id and only count for 30 minutes (occupancy window)
  and 15 minutes (cooldown): kept 24 h.
- Equipment reports set a machine's status for 7 days: kept 8 days.
- Turnstile readings only matter for the current day (counters restart at midnight): kept 2 days.
- Expired quiet-gym alerts (push subscriptions) are erased even when notifications are off.

What stays is the aggregated history: one level per gym and quarter hour, with no id.
"""

from sqlalchemy import delete
from sqlalchemy.orm import Session

from .db import Alert, EquipmentReport, OfficialCount, Report
from .equipment import STATUS_WINDOW_SECONDS

REPORT_RETENTION_SECONDS = 24 * 3600
EQUIPMENT_RETENTION_SECONDS = STATUS_WINDOW_SECONDS + 24 * 3600
OFFICIAL_RETENTION_SECONDS = 2 * 24 * 3600


def purge(session: Session, now: int) -> dict[str, int]:
    """Deletes what is past its retention period; returns the number of rows per table."""
    deleted = {
        "reports": session.execute(delete(Report).where(Report.ts < now - REPORT_RETENTION_SECONDS)).rowcount,
        "equipment_reports": session.execute(
            delete(EquipmentReport).where(EquipmentReport.ts < now - EQUIPMENT_RETENTION_SECONDS)
        ).rowcount,
        "official_counts": session.execute(
            delete(OfficialCount).where(OfficialCount.ts < now - OFFICIAL_RETENTION_SECONDS)
        ).rowcount,
        "alerts": session.execute(delete(Alert).where(Alert.expires_ts <= now)).rowcount,
    }
    session.commit()
    return deleted
