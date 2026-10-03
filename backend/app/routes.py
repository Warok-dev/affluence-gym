import hmac
import time
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, equipment, notifications
from . import history as hist
from .config import COOLDOWN_SECONDS, DEMO_DATA, LABELS, TIMEZONE
from .db import EquipmentReport, OfficialCount, Report, get_session
from .facilities import FACILITIES
from .forecast.service import forecast, forecast_service
from .ratelimit import limit_writes
from .sources import source

router = APIRouter()
SessionDep = Annotated[Session, Depends(get_session)]


def check_facility(facility: str) -> str:
    if facility not in FACILITIES:
        raise HTTPException(404, "Salle inconnue")
    return facility


FacilityDep = Annotated[str, Depends(check_facility)]


class ReportIn(BaseModel):
    facility: str
    level: int = Field(ge=1, le=4)
    client_id: str = Field(min_length=8, max_length=64)  # UUID anonyme généré par l'app


@router.get("/health")
def health():
    # "demo" is additive (UI phase): true when serving the synthetic demo database.
    return {"status": "ok", "demo": DEMO_DATA}


@router.post("/reports", status_code=201, dependencies=[Depends(limit_writes)])
def create_report(report: ReportIn, session: SessionDep):
    check_facility(report.facility)
    now = int(time.time())
    recent = session.scalar(
        select(Report.id).where(
            Report.facility == report.facility,
            Report.client_id == report.client_id,
            Report.ts > now - COOLDOWN_SECONDS,
        )
    )
    if recent is not None:
        raise HTTPException(429, "Tu as déjà signalé récemment, réessaie plus tard")
    session.add(Report(facility=report.facility, level=report.level, client_id=report.client_id, ts=now))
    session.commit()
    return {"status": "enregistré"}


@router.get("/occupancy/{facility}")
def get_occupancy(facility: FacilityDep, session: SessionDep):
    occ = source.current(session, facility, int(time.time()))
    return {
        "facility": facility,
        "level": occ.level,
        "label": LABELS[occ.level] if occ.level else "Pas de données",
        "reports": occ.reports,
        "last_report_ts": occ.last_report_ts,  # champ additif (phase 2)
        # Champs additifs (compteur officiel) :
        "source": occ.source,  # "official" ou "crowd"
        "people": occ.people,  # personnes présentes (source officielle), sinon null
        "capacity": occ.capacity,
        "estimated": occ.estimated,  # true : estimé à partir des seules entrées
        "updated_ts": occ.updated_ts,  # heure de la lecture du compteur
    }


@router.get("/history/{facility}")
def get_history(facility: FacilityDep, session: SessionDep, days: Annotated[int, Query(ge=1, le=90)] = 7):
    points = hist.history(session, facility, days, int(time.time()))
    return {
        "facility": facility,
        "days": days,
        "points": [{"ts": p.ts, "level": p.level, "source": p.source} for p in points],
    }


@router.get("/profile/{facility}")
def get_profile(
    facility: FacilityDep,
    session: SessionDep,
    weekday: Annotated[int | None, Query(ge=0, le=6, description="0 = lundi; défaut : aujourd'hui")] = None,
    weeks: Annotated[int, Query(ge=1, le=52)] = 8,
):
    """Typical level per hour for a weekday (local time), over the last `weeks` weeks."""
    now = int(time.time())
    if weekday is None:
        weekday = datetime.fromtimestamp(now, TIMEZONE).weekday()
    hours = FACILITIES[facility].opening_hours[weekday]
    return {
        "facility": facility,
        "weekday": weekday,
        "weeks": weeks,
        "timezone": str(TIMEZONE),
        "opening_hours": {"open": hours[0], "close": hours[1]} if hours else None,
        "hours": [vars(h) for h in hist.profile(session, facility, weekday, weeks, now)],
    }


@router.get("/trends/{facility}")
def get_trends(facility: FacilityDep, session: SessionDep, weeks: Annotated[int, Query(ge=1, le=52)] = 8):
    """The typical week: average level per weekday and opening hour over the last `weeks` weeks."""
    days = hist.week_trends(session, facility, weeks, int(time.time()))
    return {
        "facility": facility,
        "weeks": weeks,
        "timezone": str(TIMEZONE),
        "capacity": FACILITIES[facility].capacity,
        "days": [
            {
                "weekday": d.weekday,
                "opening_hours": {"open": d.opening_hours[0], "close": d.opening_hours[1]} if d.opening_hours else None,
                "hours": [vars(h) for h in d.hours],
            }
            for d in days
        ],
    }


@router.get("/forecast/{facility}")
def get_forecast(facility: FacilityDep, session: SessionDep, hours: Annotated[int, Query(ge=1, le=48)] = 12):
    """Predicted level for the next `hours` whole hours when the gym is open."""
    now = int(time.time())
    trained = forecast_service.get(session, now)
    points = forecast(trained, facility, now, hours) if trained else []
    next_calm = next((p for p in points if p.calm), None)
    return {
        "facility": facility,
        "available": trained is not None,
        "model": trained.name if trained else None,
        "trained_at": trained.trained_at if trained else None,
        "training_samples": trained.samples if trained else 0,
        "validation_mae": {name: m["mae"] for name, m in trained.validation.items()} if trained else {},
        "timezone": str(TIMEZONE),
        "hours": [vars(p) for p in points],
        "next_calm": {"ts": next_calm.ts, "hour": next_calm.hour} if next_calm else None,
    }


class CountsIn(BaseModel):
    """Turnstile counters, cumulative since midnight (gym local time). Aggregates only."""

    entries: int = Field(ge=0, le=100_000)
    exits: int | None = Field(default=None, ge=0, le=100_000)  # null: no exit counter
    ts: int | None = None  # epoch seconds of the reading; default: reception time


def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    if not config.OFFICIAL_API_KEY:
        raise HTTPException(503, "Réception des compteurs non configurée")
    if not x_api_key or not hmac.compare_digest(x_api_key, config.OFFICIAL_API_KEY):
        raise HTTPException(401, "Clé d'API invalide")


@router.post("/official/{facility}/counts", status_code=201, dependencies=[Depends(require_api_key)])
def post_counts(facility: FacilityDep, counts: CountsIn, session: SessionDep):
    """Endpoint for the university's system: one reading of the entry/exit counters."""
    now = int(time.time())
    ts = counts.ts if counts.ts is not None else now
    if ts > now + 60 or ts < now - 86_400:
        raise HTTPException(422, "Horodatage hors de la fenêtre acceptée (dernières 24 h)")
    session.add(OfficialCount(facility=facility, ts=ts, entries=counts.entries, exits=counts.exits))
    session.commit()
    return {"status": "enregistré"}


class EquipmentReportIn(BaseModel):
    status: Literal["broken", "ok"]
    client_id: str = Field(min_length=8, max_length=64)  # same anonymous id as crowd reports


@router.get("/equipment/{facility}")
def get_equipment(facility: FacilityDep, session: SessionDep):
    """Each machine with its crowd-reported status (latest report of the last 7 days)."""
    items = equipment.statuses(session, facility, int(time.time()))
    return {
        "facility": facility,
        "window_days": equipment.STATUS_WINDOW_SECONDS // 86400,
        "machines": [
            {
                "id": s.machine.id,
                "name": s.machine.name,
                "category": s.machine.category,
                "status": s.status,
                "since_ts": s.since_ts,
                "reports": s.reports,
            }
            for s in items
        ],
    }


@router.post("/equipment/{facility}/{machine_id}/reports", status_code=201, dependencies=[Depends(limit_writes)])
def report_equipment(facility: FacilityDep, machine_id: str, report: EquipmentReportIn, session: SessionDep):
    if equipment.find_machine(facility, machine_id) is None:
        raise HTTPException(404, "Machine inconnue")
    now = int(time.time())
    if equipment.recently_reported(session, facility, machine_id, report.client_id, now):
        raise HTTPException(429, "Tu as déjà signalé cette machine récemment")
    session.add(
        EquipmentReport(
            facility=facility, equipment_id=machine_id, status=report.status, client_id=report.client_id, ts=now
        )
    )
    session.commit()
    return {"status": "enregistré"}


class PushKeys(BaseModel):
    p256dh: str = Field(min_length=10, max_length=256)
    auth: str = Field(min_length=8, max_length=64)


class PushSubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=10, max_length=1024, pattern=r"^https://")
    keys: PushKeys

    @field_validator("endpoint")
    @classmethod
    def known_push_service(cls, endpoint: str) -> str:
        # The server will POST to this address: only the browsers' push services are accepted,
        # otherwise anyone could make it call an arbitrary URL (server-side request forgery).
        if not notifications.is_push_service(endpoint):
            raise ValueError("unknown push service")
        return endpoint


class AlertIn(BaseModel):
    facility: str
    subscription: PushSubscriptionIn
    # Optional (added with the English UI): language of the notification text.
    lang: Literal["fr", "en"] = "fr"


@router.get("/notifications/config")
def notifications_config():
    """Whether push notifications are available, and the public key the browser needs."""
    on = notifications.enabled()
    return {"enabled": on, "public_key": config.VAPID_PUBLIC_KEY if on else None}


@router.post("/alerts", status_code=201, dependencies=[Depends(limit_writes)])
def create_alert(body: AlertIn, session: SessionDep):
    """Arm a one-shot "tell me when it gets quiet" alert, valid until closing time today."""
    if not notifications.enabled():
        raise HTTPException(503, "Notifications non configurées")
    check_facility(body.facility)
    now = int(time.time())
    expires = notifications.closing_ts(body.facility, now)
    if expires is None:
        raise HTTPException(409, "La salle est fermée en ce moment")
    keys = body.subscription.keys
    sub = notifications.Subscription(body.subscription.endpoint, keys.p256dh, keys.auth)
    alert, token = notifications.create_alert(session, body.facility, sub, now, expires, body.lang)
    return {"id": alert.id, "token": token, "expires_ts": expires}


@router.delete("/alerts/{alert_id}", status_code=204, dependencies=[Depends(limit_writes)])
def delete_alert(alert_id: str, session: SessionDep, x_alert_token: Annotated[str | None, Header()] = None):
    if not x_alert_token or not notifications.cancel_alert(session, alert_id, x_alert_token):
        raise HTTPException(404, "Alerte introuvable")
