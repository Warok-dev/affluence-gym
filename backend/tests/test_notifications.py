from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app import config, notifications
from app.config import TIMEZONE
from app.db import Alert, OfficialCount, Report, SessionLocal
from app.main import app
from app.sources import PreferOfficialSource

client = TestClient(app)
SUB = notifications.Subscription("https://push.example/abc", "p256dh-key-value", "auth-secret")


def local_ts(*args: int) -> int:
    return int(datetime(*args, tzinfo=TIMEZONE).timestamp())


NOW = local_ts(2026, 10, 1, 18, 0)  # Thursday, gyms open 06:30-23:00


@pytest.fixture(autouse=True)
def session(monkeypatch):
    monkeypatch.setattr(config, "VAPID_PUBLIC_KEY", "public-key")
    monkeypatch.setattr(config, "VAPID_PRIVATE_KEY", "private-key")
    monkeypatch.setattr(config, "VAPID_SUBJECT", "mailto:test@example.com")
    with SessionLocal() as s:
        for model in (Alert, Report, OfficialCount):
            s.execute(delete(model))
        s.commit()
        yield s


class FakeSender:
    def __init__(self):
        self.sent = []

    def __call__(self, alert, payload):
        self.sent.append((alert.facility, payload))
        return True


def busy(session, facility="minto", at=NOW):
    session.add(Report(facility=facility, level=4, client_id="busy-1234", ts=at - 60))
    session.commit()


def quiet(session, facility="minto", at=NOW):
    session.add(OfficialCount(facility=facility, ts=at - 30, entries=20, exits=10))  # 10 people
    session.commit()


def test_closing_time_today_or_none_when_closed():
    assert notifications.closing_ts("minto", NOW) == local_ts(2026, 10, 1, 23, 0)
    assert notifications.closing_ts("minto", local_ts(2026, 10, 1, 23, 30)) is None
    assert notifications.closing_ts("minto", local_ts(2026, 10, 1, 5, 0)) is None


def test_alert_fires_once_when_the_gym_gets_quiet(session):
    alert, _ = notifications.create_alert(session, "minto", SUB, NOW, NOW + 3600)
    busy(session)
    sender = FakeSender()
    assert notifications.check_alerts(session, PreferOfficialSource(), NOW, sender) == 0
    assert session.get(Alert, alert.id) is not None

    quiet(session, at=NOW + 600)
    assert notifications.check_alerts(session, PreferOfficialSource(), NOW + 600, sender) == 1
    assert sender.sent == [
        (
            "minto",
            {"title": "Minto est calme", "body": "C'est le bon moment pour y aller.", "url": "/", "tag": "quiet-minto"},
        )
    ]
    # One-shot: the subscription is gone from the server.
    assert session.scalars(select(Alert)).all() == []
    assert notifications.check_alerts(session, PreferOfficialSource(), NOW + 700, sender) == 0


def test_expired_alerts_are_dropped_without_sending(session):
    notifications.create_alert(session, "minto", SUB, NOW, NOW + 60)
    sender = FakeSender()
    assert notifications.check_alerts(session, PreferOfficialSource(), NOW + 61, sender) == 0
    assert sender.sent == [] and session.scalars(select(Alert)).all() == []


def test_rearming_replaces_the_previous_alert_of_the_device(session):
    notifications.create_alert(session, "minto", SUB, NOW, NOW + 3600)
    notifications.create_alert(session, "minto", SUB, NOW + 10, NOW + 3600)
    notifications.create_alert(session, "montpetit", SUB, NOW + 20, NOW + 3600)
    assert sorted(a.facility for a in session.scalars(select(Alert))) == ["minto", "montpetit"]


def test_cancel_requires_the_token(session):
    alert, token = notifications.create_alert(session, "minto", SUB, NOW, NOW + 3600)
    assert notifications.cancel_alert(session, alert.id, "wrong") is False
    assert notifications.cancel_alert(session, alert.id, token) is True
    assert session.get(Alert, alert.id) is None


# --- endpoints ---------------------------------------------------------------------

BODY = {
    "facility": "minto",
    "subscription": {"endpoint": SUB.endpoint, "keys": {"p256dh": SUB.p256dh, "auth": SUB.auth}},
}


def test_config_endpoint(monkeypatch):
    assert client.get("/notifications/config").json() == {"enabled": True, "public_key": "public-key"}
    monkeypatch.setattr(config, "VAPID_PRIVATE_KEY", "")
    assert client.get("/notifications/config").json() == {"enabled": False, "public_key": None}
    assert client.post("/alerts", json=BODY).status_code == 503


def test_create_and_cancel_an_alert(monkeypatch):
    monkeypatch.setattr(notifications, "closing_ts", lambda facility, now: now + 3600)
    r = client.post("/alerts", json=BODY)
    assert r.status_code == 201
    data = r.json()
    assert set(data) == {"id", "token", "expires_ts"}
    assert client.delete(f"/alerts/{data['id']}", headers={"X-Alert-Token": "nope"}).status_code == 404
    assert client.delete(f"/alerts/{data['id']}", headers={"X-Alert-Token": data["token"]}).status_code == 204


def test_alert_refused_when_the_gym_is_closed(monkeypatch):
    monkeypatch.setattr(notifications, "closing_ts", lambda facility, now: None)
    assert client.post("/alerts", json=BODY).status_code == 409


def test_alert_validation():
    bad = {**BODY, "subscription": {**BODY["subscription"], "endpoint": "http://insecure.example/x"}}
    assert client.post("/alerts", json=bad).status_code == 422
    assert client.post("/alerts", json={**BODY, "facility": "nope"}).status_code == 404
