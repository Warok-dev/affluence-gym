"""Equipment of each gym and its crowd-reported status.

The machine lists are PROVISIONAL (to be checked with Sports Services). A machine's
status is the most recent report of the last STATUS_WINDOW_SECONDS: "broken" or "ok";
without a recent report it is "unknown".
"""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import EquipmentReport

STATUS_WINDOW_SECONDS = 7 * 86400
EQUIPMENT_COOLDOWN_SECONDS = 30 * 60  # one report per person, per machine, per 30 min


@dataclass(frozen=True)
class Machine:
    id: str
    name: str
    category: str  # "cardio" | "free-weights" | "machines"


def _machines(*specs: tuple[str, str, str, int]) -> tuple[Machine, ...]:
    out = []
    for prefix, name, category, count in specs:
        for n in range(1, count + 1):
            out.append(Machine(f"{prefix}-{n}", f"{name} {n}" if count > 1 else name, category))
    return tuple(out)


EQUIPMENT: dict[str, tuple[Machine, ...]] = {
    "minto": _machines(
        ("treadmill", "Tapis de course", "cardio", 4),
        ("bike", "Vélo", "cardio", 2),
        ("rower", "Rameur", "cardio", 2),
        ("squat-rack", "Rack à squat", "free-weights", 3),
        ("bench", "Banc de développé couché", "free-weights", 2),
        ("cable", "Poulie double", "machines", 2),
        ("leg-press", "Presse à cuisses", "machines", 1),
        ("lat-pulldown", "Tirage vertical", "machines", 1),
    ),
    "montpetit": _machines(
        ("treadmill", "Tapis de course", "cardio", 3),
        ("elliptical", "Elliptique", "cardio", 2),
        ("squat-rack", "Rack à squat", "free-weights", 2),
        ("bench", "Banc de développé couché", "free-weights", 2),
        ("cable", "Poulie double", "machines", 1),
        ("leg-curl", "Leg curl", "machines", 1),
    ),
}


def find_machine(facility: str, machine_id: str) -> Machine | None:
    return next((m for m in EQUIPMENT.get(facility, ()) if m.id == machine_id), None)


@dataclass(frozen=True)
class MachineStatus:
    machine: Machine
    status: str  # "broken" | "ok" | "unknown"
    since_ts: int | None  # time of the report that set the status
    reports: int  # reports in the window


def statuses(session: Session, facility: str, now: int) -> list[MachineStatus]:
    since = now - STATUS_WINDOW_SECONDS
    rows = session.execute(
        select(EquipmentReport.equipment_id, EquipmentReport.status, EquipmentReport.ts)
        .where(EquipmentReport.facility == facility, EquipmentReport.ts >= since)
        .order_by(EquipmentReport.ts.desc(), EquipmentReport.id.desc())
    ).all()
    latest: dict[str, tuple[str, int]] = {}
    counts: dict[str, int] = {}
    for equipment_id, status, ts in rows:
        latest.setdefault(equipment_id, (status, ts))
        counts[equipment_id] = counts.get(equipment_id, 0) + 1
    out = []
    for machine in EQUIPMENT[facility]:
        status, ts = latest.get(machine.id, ("unknown", None))
        out.append(MachineStatus(machine, status, ts, counts.get(machine.id, 0)))
    return out


def recently_reported(session: Session, facility: str, machine_id: str, client_id: str, now: int) -> bool:
    return (
        session.scalar(
            select(func.count()).where(
                EquipmentReport.facility == facility,
                EquipmentReport.equipment_id == machine_id,
                EquipmentReport.client_id == client_id,
                EquipmentReport.ts > now - EQUIPMENT_COOLDOWN_SECONDS,
            )
        )
        > 0
    )
