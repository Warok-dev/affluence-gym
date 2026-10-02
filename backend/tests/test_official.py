import time
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app import config
from app.config import TIMEZONE
from app.db import OccupancySnapshot, OfficialCount, Report, SessionLocal
from app.history import take_snapshots
from app.main import app
from app.sources import OfficialCounterSource, PreferOfficialSource, level_from_ratio, start_of_local_day

client = TestClient(app)
KEY = "test-secret-key"


def local_ts(*args: int) -> int:
    return int(datetime(*args, tzinfo=TIMEZONE).timestamp())


NOW = local_ts(2026, 10, 1, 18, 0)


@pytest.fixture(autouse=True)
def session(monkeypatch):
    monkeypatch.setattr(config, "OFFICIAL_API_KEY", KEY)
    with SessionLocal() as s:
        for model in (OfficialCount, Report, OccupancySnapshot):
            s.execute(delete(model))
        s.commit()
        yield s


def add_reading(session, ts, entries, exits=None, facility="minto"):
    session.add(OfficialCount(facility=facility, ts=ts, entries=entries, exits=exits))
    session.commit()


# --- computing people present ---------------------------------------------------


def test_people_is_entries_minus_exits(session):
    add_reading(session, NOW - 60, entries=180, exits=133)
    occ = OfficialCounterSource().current(session, "minto", NOW)
    assert (occ.people, occ.capacity, occ.estimated, occ.source) == (47, 120, False, "official")
    assert occ.level == 2  # 47/120 = 39% -> Calme
    assert occ.updated_ts == NOW - 60


def test_latest_reading_wins(session):
    add_reading(session, NOW - 300, entries=100, exits=90)
    add_reading(session, NOW - 30, entries=150, exits=60)
    assert OfficialCounterSource().current(session, "minto", NOW).people == 90


def test_never_negative_when_exit_counter_runs_ahead(session):
    add_reading(session, NOW - 30, entries=10, exits=14)
    assert OfficialCounterSource().current(session, "minto", NOW).people == 0


def test_estimate_from_entries_when_there_is_no_exit_counter(session):
    stay = config.AVERAGE_STAY_SECONDS
    add_reading(session, NOW - stay - 60, entries=200)  # just before the stay window
    add_reading(session, NOW - 60, entries=260)
    occ = OfficialCounterSource().current(session, "minto", NOW)
    assert occ.people == 60 and occ.estimated is True


def test_stale_or_yesterday_readings_are_ignored(session):
    add_reading(session, NOW - config.OFFICIAL_STALE_SECONDS - 1, entries=50, exits=0)
    assert OfficialCounterSource().current(session, "minto", NOW) is None
    midnight = start_of_local_day(NOW)
    add_reading(session, midnight - 10, entries=999, exits=0)  # yesterday's counter
    assert OfficialCounterSource().current(session, "minto", midnight + 60) is None


def test_falls_back_to_crowd_reports_without_a_fresh_counter(session):
    session.add(Report(facility="minto", level=3, client_id="abcdefgh", ts=NOW - 60))
    session.commit()
    occ = PreferOfficialSource().current(session, "minto", NOW)
    assert occ.source == "crowd" and occ.level == 3 and occ.people is None
    add_reading(session, NOW - 60, entries=110, exits=10)
    occ = PreferOfficialSource().current(session, "minto", NOW)
    assert occ.source == "official" and occ.people == 100 and occ.level == 4


@pytest.mark.parametrize(("people", "level"), [(0, 1), (29, 1), (30, 2), (59, 2), (60, 3), (89, 3), (90, 4), (150, 4)])
def test_level_from_ratio(people, level):
    assert level_from_ratio(people, 120) == level


def test_snapshot_records_official_source_and_people(session):
    add_reading(session, NOW - 60, entries=80, exits=20)
    take_snapshots(session, PreferOfficialSource(), NOW)
    snap = session.scalars(select(OccupancySnapshot).where(OccupancySnapshot.facility == "minto")).one()
    assert (snap.source, snap.people, snap.level) == ("official", 60, 3)


# --- ingestion endpoint -----------------------------------------------------------


def post(body, key=KEY, facility="minto"):
    headers = {"X-Api-Key": key} if key is not None else {}
    return client.post(f"/official/{facility}/counts", json=body, headers=headers)


def test_ingestion_requires_the_api_key():
    assert post({"entries": 5}, key=None).status_code == 401
    assert post({"entries": 5}, key="wrong").status_code == 401
    assert post({"entries": 5}).status_code == 201


def test_ingestion_is_disabled_without_a_configured_key(monkeypatch):
    monkeypatch.setattr(config, "OFFICIAL_API_KEY", "")
    assert post({"entries": 5}).status_code == 503


def test_ingestion_validates_input():
    assert post({"entries": -1}).status_code == 422
    assert post({"entries": 5, "exits": -2}).status_code == 422
    assert post({"entries": 5}, facility="nope").status_code == 404
    assert post({"entries": 5, "ts": int(time.time()) + 3600}).status_code == 422
    assert post({"entries": 5, "ts": int(time.time()) - 2 * 86400}).status_code == 422


def test_occupancy_endpoint_exposes_the_official_count():
    assert post({"entries": 64, "exits": 22}).status_code == 201
    data = client.get("/occupancy/minto").json()
    assert data["source"] == "official"
    assert data["people"] == 42 and data["capacity"] == 120 and data["estimated"] is False
    assert data["level"] == 2 and data["label"] == "Calme"
    assert data["updated_ts"] is not None
    # The other gym, without counter, still uses crowd reports.
    assert client.get("/occupancy/montpetit").json()["source"] == "crowd"
