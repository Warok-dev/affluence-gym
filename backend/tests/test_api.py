import os
import tempfile
import time

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_empty_occupancy():
    r = client.get("/occupancy/minto")
    assert r.status_code == 200
    assert r.json()["level"] is None


def test_report_then_read():
    r = client.post("/reports", json={"facility": "minto", "level": 3, "client_id": "abcdefgh-1"})
    assert r.status_code == 201
    data = client.get("/occupancy/minto").json()
    assert data["level"] == 3 and data["label"] == "Modéré" and data["reports"] == 1


def test_cooldown_blocks_spam():
    body = {"facility": "montpetit", "level": 2, "client_id": "abcdefgh-2"}
    assert client.post("/reports", json=body).status_code == 201
    assert client.post("/reports", json=body).status_code == 429


def test_validation():
    assert client.post("/reports", json={"facility": "minto", "level": 9, "client_id": "abcdefgh-3"}).status_code == 422
    assert client.post("/reports", json={"facility": "nope", "level": 2, "client_id": "abcdefgh-3"}).status_code == 404


def test_last_report_ts():
    body = {"facility": "minto", "level": 1, "client_id": "abcdefgh-4"}
    before = int(time.time())
    assert client.post("/reports", json=body).status_code == 201
    ts = client.get("/occupancy/minto").json()["last_report_ts"]
    assert before <= ts <= int(time.time())


def test_last_report_ts_null_when_empty():
    # The test DB is shared across tests: empty one facility to check the "no data" shape.
    from sqlalchemy import delete

    from app.db import Report, SessionLocal

    with SessionLocal() as session:
        session.execute(delete(Report).where(Report.facility == "montpetit"))
        session.commit()
    data = client.get("/occupancy/montpetit").json()
    assert data == {
        "facility": "montpetit",
        "level": None,
        "label": "Pas de données",
        "reports": 0,
        "last_report_ts": None,
    }


def test_cors_allows_dev_origin():
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_rejects_unknown_origin():
    r = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in r.headers
