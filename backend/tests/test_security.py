from fastapi.testclient import TestClient

from app import config, notifications
from app.main import app
from app.ratelimit import RateLimiter

client = TestClient(app)
ORIGIN = config.ALLOWED_ORIGINS[0]


def test_cors_preflight_allows_cancelling_an_alert_from_the_site():
    r = client.options(
        "/alerts/some-id",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "x-alert-token",
        },
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == ORIGIN
    assert "DELETE" in r.headers["access-control-allow-methods"]
    assert "x-alert-token" in r.headers["access-control-allow-headers"].lower()


def test_cors_refuses_other_origins():
    r = client.options(
        "/reports",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in r.headers


def test_only_browser_push_services_are_accepted():
    ok = [
        "https://fcm.googleapis.com/fcm/send/abc",
        "https://updates.push.services.mozilla.com/wpush/v2/abc",
        "https://web.push.apple.com/abc",
        "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]
    bad = [
        "http://fcm.googleapis.com/fcm/send/abc",
        "https://fcm.googleapis.com.evil.example/x",
        "https://evilfcm.googleapis.com.example/x",
        "https://169.254.169.254/latest/meta-data",
        "https://localhost/admin",
        "https://fcm.googleapis.com:8443/x",
    ]
    assert all(notifications.is_push_service(u) for u in ok)
    assert not any(notifications.is_push_service(u) for u in bad)


def test_alert_with_an_arbitrary_endpoint_is_refused(monkeypatch):
    monkeypatch.setattr(config, "VAPID_PUBLIC_KEY", "public-key")
    monkeypatch.setattr(config, "VAPID_PRIVATE_KEY", "private-key")
    monkeypatch.setattr(config, "VAPID_SUBJECT", "mailto:test@example.com")
    body = {
        "facility": "minto",
        "subscription": {
            "endpoint": "https://internal.example/hook",
            "keys": {"p256dh": "p256dh-key-value", "auth": "auth-secret"},
        },
    }
    assert client.post("/alerts", json=body).status_code == 422


def test_rate_limiter_sliding_window():
    limiter = RateLimiter()
    assert all(limiter.allow("1.2.3.4", 100.0, 3, 60) for _ in range(3))
    assert not limiter.allow("1.2.3.4", 100.0, 3, 60)
    assert limiter.allow("5.6.7.8", 100.0, 3, 60)  # per address
    assert limiter.allow("1.2.3.4", 161.0, 3, 60)  # the window slid


def test_write_endpoints_are_rate_limited_per_ip(monkeypatch):
    monkeypatch.setattr(config, "WRITE_RATE_LIMIT", 3)
    codes = [
        client.post("/reports", json={"facility": "minto", "level": 2, "client_id": f"client-{i:04d}"}).status_code
        for i in range(4)
    ]
    assert codes == [201, 201, 201, 429]
    r = client.post("/reports", json={"facility": "minto", "level": 2, "client_id": "client-9999"})
    assert r.status_code == 429 and "retry-after" in r.headers
    # Reads are never limited.
    assert client.get("/occupancy/minto").status_code == 200
