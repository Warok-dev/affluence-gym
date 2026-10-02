import time
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app import history as hist
from app.config import TIMEZONE
from app.db import OccupancySnapshot, Report, SessionLocal
from app.main import app
from app.sources import CrowdSource

client = TestClient(app)
source = CrowdSource()


def local_ts(*args: int) -> int:
    return int(datetime(*args, tzinfo=TIMEZONE).timestamp())


# Monday 2026-09-28, 18:07 local time
NOW = local_ts(2026, 9, 28, 18, 7)


@pytest.fixture(autouse=True)
def session():
    with SessionLocal() as s:
        s.execute(delete(Report))
        s.execute(delete(OccupancySnapshot))
        s.commit()
        yield s


def add_snapshots(session, facility: str, *points: tuple[int, int]) -> None:
    session.add_all(OccupancySnapshot(facility=facility, ts=ts, level=lvl, source="crowd") for ts, lvl in points)
    session.commit()


# --- snapshots ---------------------------------------------------------------


def test_snapshot_records_quarter_hour_and_skips_facilities_without_data(session):
    session.add_all(
        [
            Report(facility="minto", level=4, client_id="c1", ts=NOW - 60),
            Report(facility="minto", level=3, client_id="c2", ts=NOW - 120),
        ]
    )
    session.commit()

    assert hist.take_snapshots(session, source, NOW) == 1
    snap = session.scalars(select(OccupancySnapshot)).one()
    assert snap.facility == "minto"
    assert snap.ts == local_ts(2026, 9, 28, 18, 0)  # floored to the quarter hour
    assert snap.level == 4  # round(3.5) == 4
    assert snap.source == "crowd"


def test_snapshot_is_idempotent_within_a_quarter_hour(session):
    session.add(Report(facility="minto", level=2, client_id="c1", ts=NOW - 60))
    session.commit()
    assert hist.take_snapshots(session, source, NOW) == 1
    assert hist.take_snapshots(session, source, NOW + 5 * 60) == 0
    assert len(session.scalars(select(OccupancySnapshot)).all()) == 1


def test_snapshot_ignores_reports_older_than_the_window(session):
    session.add(Report(facility="minto", level=2, client_id="c1", ts=NOW - 31 * 60))
    session.commit()
    assert hist.take_snapshots(session, source, NOW) == 0


# --- profile -----------------------------------------------------------------


def test_opening_hour_range():
    assert list(hist.opening_hour_range("06:30", "23:00")) == list(range(6, 23))
    assert list(hist.opening_hour_range("08:00", "20:30")) == list(range(8, 21))


def test_profile_averages_by_local_hour_and_flags_calm_slots(session):
    add_snapshots(
        session,
        "minto",
        # two previous Mondays at 7 h: calm
        (local_ts(2026, 9, 21, 7, 0), 1),
        (local_ts(2026, 9, 14, 7, 15), 2),
        # Mondays at 18 h: packed
        (local_ts(2026, 9, 21, 18, 0), 4),
        (local_ts(2026, 9, 14, 18, 30), 4),
        # a single sample is not enough to call an hour calm
        (local_ts(2026, 9, 21, 12, 0), 1),
        # a Tuesday must not count for Monday
        (local_ts(2026, 9, 22, 7, 0), 4),
        # older than the 8-week window
        (local_ts(2026, 7, 6, 7, 0), 4),
    )
    hours = {h.hour: h for h in hist.profile(session, "minto", weekday=0, weeks=8, now=NOW)}

    assert min(hours) == 6 and max(hours) == 22  # weekday opening hours 06:30-23:00
    assert hours[7] == hist.HourProfile(hour=7, level=1.5, samples=2, calm=True)
    assert hours[18] == hist.HourProfile(hour=18, level=4.0, samples=2, calm=False)
    assert hours[12].calm is False and hours[12].samples == 1
    assert hours[9] == hist.HourProfile(hour=9, level=None, samples=0, calm=False)


def test_profile_is_empty_on_a_closed_day(session, monkeypatch):
    from app.facilities import FACILITIES, Facility

    closed = Facility("minto", "Minto", (None,) * 7, capacity=120)
    monkeypatch.setitem(FACILITIES, "minto", closed)
    assert hist.profile(session, "minto", weekday=0, weeks=8, now=NOW) == []


# --- endpoints ---------------------------------------------------------------


def test_history_endpoint(session):
    now = int(time.time())
    add_snapshots(session, "montpetit", (now - 3600, 2), (now - 10 * 86400, 3))
    data = client.get("/history/montpetit?days=7").json()
    assert data["facility"] == "montpetit" and data["days"] == 7
    assert data["points"] == [{"ts": now - 3600, "level": 2, "source": "crowd"}]


def test_history_validation():
    assert client.get("/history/nope").status_code == 404
    assert client.get("/history/minto?days=0").status_code == 422
    assert client.get("/history/minto?days=91").status_code == 422


def test_profile_endpoint_defaults_to_today():
    data = client.get("/profile/minto").json()
    assert data["weekday"] == datetime.now(TIMEZONE).weekday()
    assert data["timezone"] == "America/Toronto"
    assert data["weeks"] == 8
    assert set(data["opening_hours"]) == {"open", "close"}
    assert data["hours"][0] == {"hour": data["hours"][0]["hour"], "level": None, "samples": 0, "calm": False}


def test_profile_endpoint_validation():
    assert client.get("/profile/nope").status_code == 404
    assert client.get("/profile/minto?weekday=7").status_code == 422
    assert client.get("/profile/minto?weeks=0").status_code == 422
    assert client.get("/profile/minto?weekday=5").json()["opening_hours"] == {"open": "08:00", "close": "20:00"}
