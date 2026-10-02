import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app import equipment
from app.db import EquipmentReport, SessionLocal
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def session():
    with SessionLocal() as s:
        s.execute(delete(EquipmentReport))
        s.commit()
        yield s


def report(machine, status, client_id="abcdefgh-eq", facility="minto"):
    return client.post(f"/equipment/{facility}/{machine}/reports", json={"status": status, "client_id": client_id})


def machine(data, machine_id):
    return next(m for m in data["machines"] if m["id"] == machine_id)


def test_lists_every_machine_unknown_without_reports():
    data = client.get("/equipment/minto").json()
    assert data["window_days"] == 7
    assert len(data["machines"]) == len(equipment.EQUIPMENT["minto"])
    assert {m["status"] for m in data["machines"]} == {"unknown"}
    assert machine(data, "treadmill-1") == {
        "id": "treadmill-1",
        "name": "Tapis de course 1",
        "category": "cardio",
        "status": "unknown",
        "since_ts": None,
        "reports": 0,
    }


def test_latest_report_sets_the_status():
    assert report("treadmill-2", "broken", "client-aaaa").status_code == 201
    data = client.get("/equipment/minto").json()
    assert machine(data, "treadmill-2")["status"] == "broken"
    assert machine(data, "treadmill-2")["since_ts"] is not None
    assert report("treadmill-2", "ok", "client-bbbb").status_code == 201
    m = machine(client.get("/equipment/minto").json(), "treadmill-2")
    assert m["status"] == "ok" and m["reports"] == 2


def test_reports_older_than_the_window_are_ignored(session):
    old = int(time.time()) - equipment.STATUS_WINDOW_SECONDS - 60
    session.add(EquipmentReport(facility="minto", equipment_id="bike-1", status="broken", client_id="x" * 8, ts=old))
    session.commit()
    assert machine(client.get("/equipment/minto").json(), "bike-1")["status"] == "unknown"


def test_cooldown_per_person_and_machine():
    assert report("rower-1", "broken").status_code == 201
    assert report("rower-1", "ok").status_code == 429
    assert report("rower-2", "broken").status_code == 201  # another machine is fine


def test_validation():
    assert report("rower-1", "exploded").status_code == 422
    assert report("nope", "broken").status_code == 404
    assert report("treadmill-4", "broken", facility="montpetit").status_code == 404  # Montpetit has 3
    assert client.get("/equipment/nope").status_code == 404
    short_id = {"status": "ok", "client_id": "short"}
    assert client.post("/equipment/minto/rower-1/reports", json=short_id).status_code == 422
