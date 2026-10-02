"""One-shot "tell me when this gym gets quiet" alerts, delivered by Web Push.

An alert stores the browser's push subscription only until it fires (the gym's level
drops to Calme or Vide) or expires (closing time today). Nothing else is kept.
"""

import hashlib
import json
import logging
import secrets
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import config
from .config import TIMEZONE
from .db import Alert
from .facilities import FACILITIES
from .sources import OccupancySource

log = logging.getLogger(__name__)

QUIET_MAX_LEVEL = 2  # Calme or Vide


def enabled() -> bool:
    return bool(config.VAPID_PUBLIC_KEY and config.VAPID_PRIVATE_KEY and config.VAPID_SUBJECT)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def closing_ts(facility: str, now: int) -> int | None:
    """Today's closing time (epoch seconds), or None if the gym is closed now."""
    local = datetime.fromtimestamp(now, TIMEZONE)
    hours = FACILITIES[facility].opening_hours[local.weekday()]
    if hours is None:
        return None
    open_h, open_m = map(int, hours[0].split(":"))
    close_h, close_m = map(int, hours[1].split(":"))
    opening = local.replace(hour=open_h, minute=open_m, second=0, microsecond=0)
    closing = local.replace(hour=close_h, minute=close_m, second=0, microsecond=0)
    if not opening <= local < closing:
        return None
    return int(closing.timestamp())


@dataclass(frozen=True)
class Subscription:
    endpoint: str
    p256dh: str
    auth: str


def create_alert(session: Session, facility: str, sub: Subscription, now: int, expires_ts: int) -> tuple[Alert, str]:
    # One alert per device and gym: re-arming replaces the previous one.
    session.execute(delete(Alert).where(Alert.facility == facility, Alert.endpoint == sub.endpoint))
    token = secrets.token_urlsafe(24)
    alert = Alert(
        id=str(uuid.uuid4()),
        facility=facility,
        endpoint=sub.endpoint,
        p256dh=sub.p256dh,
        auth=sub.auth,
        token_hash=hash_token(token),
        created_ts=now,
        expires_ts=expires_ts,
    )
    session.add(alert)
    session.commit()
    return alert, token


def cancel_alert(session: Session, alert_id: str, token: str) -> bool:
    alert = session.get(Alert, alert_id)
    if alert is None or not secrets.compare_digest(alert.token_hash, hash_token(token)):
        return False
    session.delete(alert)
    session.commit()
    return True


# A sender returns False when the subscription is gone for good (it is then dropped).
Sender = Callable[[Alert, dict], bool]


def webpush_sender(alert: Alert, payload: dict) -> bool:
    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info={"endpoint": alert.endpoint, "keys": {"p256dh": alert.p256dh, "auth": alert.auth}},
            data=json.dumps(payload),
            vapid_private_key=config.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": config.VAPID_SUBJECT},
            ttl=900,
        )
        return True
    except WebPushException as err:
        status = getattr(err.response, "status_code", None)
        log.warning("push failed (%s)", status)
        return status not in (404, 410)


def check_alerts(session: Session, source: OccupancySource, now: int, send: Sender) -> int:
    """Fires the alerts whose gym is quiet now, drops expired ones. Returns notifications sent."""
    session.execute(delete(Alert).where(Alert.expires_ts <= now))
    session.commit()
    sent = 0
    alerts = session.scalars(select(Alert)).all()
    levels: dict[str, int | None] = {}
    for alert in alerts:
        if alert.facility not in levels:
            occ = source.current(session, alert.facility, now)
            levels[alert.facility] = occ.level
        level = levels[alert.facility]
        if level is None or level > QUIET_MAX_LEVEL:
            continue
        name = FACILITIES[alert.facility].name
        payload = {
            "title": f"{name} est calme",
            "body": "C'est le bon moment pour y aller.",
            "url": "/",
            "tag": f"quiet-{alert.facility}",
        }
        send(alert, payload)  # delivered or gone: either way the one-shot alert is done
        session.delete(alert)
        sent += 1
    session.commit()
    return sent
