import os
import tempfile

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
