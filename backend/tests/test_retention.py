from sqlalchemy import delete, func, select

from app import retention
from app.db import Alert, EquipmentReport, OfficialCount, Report, SessionLocal

NOW = 1_790_000_000
HOUR = 3600


def count(session, model) -> int:
    return session.scalar(select(func.count()).select_from(model))


def test_raw_inputs_are_erased_after_their_retention_period():
    with SessionLocal() as s:
        for model in (Report, EquipmentReport, OfficialCount, Alert):
            s.execute(delete(model))
        s.add_all(
            [
                Report(facility="minto", level=3, client_id="old-device", ts=NOW - 25 * HOUR),
                Report(facility="minto", level=2, client_id="new-device", ts=NOW - 23 * HOUR),
                EquipmentReport(
                    facility="minto", equipment_id="bench-1", status="broken", client_id="d1", ts=NOW - 9 * 24 * HOUR
                ),
                EquipmentReport(
                    facility="minto", equipment_id="bench-1", status="ok", client_id="d2", ts=NOW - 6 * 24 * HOUR
                ),
                OfficialCount(facility="minto", ts=NOW - 3 * 24 * HOUR, entries=10, exits=5),
                OfficialCount(facility="minto", ts=NOW - HOUR, entries=10, exits=5),
                Alert(
                    id="expired",
                    facility="minto",
                    endpoint="https://fcm.googleapis.com/x",
                    p256dh="k" * 10,
                    auth="a" * 8,
                    token_hash="h",
                    created_ts=NOW - 2 * HOUR,
                    expires_ts=NOW - HOUR,
                ),
            ]
        )
        s.commit()

        assert retention.purge(s, NOW) == {"reports": 1, "equipment_reports": 1, "official_counts": 1, "alerts": 1}
        assert s.scalars(select(Report.client_id)).all() == ["new-device"]
        assert count(s, EquipmentReport) == 1 and count(s, OfficialCount) == 1 and count(s, Alert) == 0
        assert retention.purge(s, NOW) == {"reports": 0, "equipment_reports": 0, "official_counts": 0, "alerts": 0}


def test_retention_outlives_every_use_of_the_data():
    from app.config import COOLDOWN_SECONDS, WINDOW_SECONDS
    from app.equipment import EQUIPMENT_COOLDOWN_SECONDS, STATUS_WINDOW_SECONDS

    assert retention.REPORT_RETENTION_SECONDS > max(WINDOW_SECONDS, COOLDOWN_SECONDS)
    assert retention.EQUIPMENT_RETENTION_SECONDS > max(STATUS_WINDOW_SECONDS, EQUIPMENT_COOLDOWN_SECONDS)
    assert retention.OFFICIAL_RETENTION_SECONDS >= 24 * HOUR
