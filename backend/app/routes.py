import time
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import history as hist
from .config import COOLDOWN_SECONDS, LABELS, TIMEZONE
from .db import Report, get_session
from .facilities import FACILITIES
from .forecast.service import forecast, forecast_service
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
    return {"status": "ok"}


@router.post("/reports", status_code=201)
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
