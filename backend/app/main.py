import os
import sqlite3
import time
from contextlib import closing

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = os.getenv("DB_PATH", "affluence.db")
WINDOW_SECONDS = 30 * 60      # on moyenne les signalements des 30 dernières minutes
COOLDOWN_SECONDS = 15 * 60    # 1 signalement par personne, par salle, par 15 min
FACILITIES = {"minto", "montpetit"}
LABELS = {1: "Vide", 2: "Calme", 3: "Modéré", 4: "Bondé"}
# Origines autorisées (séparées par des virgules) ; par défaut le serveur de dev Vite.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

app = FastAPI(title="Affluence Gym API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with closing(get_db()) as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS reports (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   facility TEXT NOT NULL,
                   level INTEGER NOT NULL,
                   client_id TEXT NOT NULL,
                   ts INTEGER NOT NULL
               )"""
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_fac_ts ON reports(facility, ts)")
        conn.commit()


init_db()


class ReportIn(BaseModel):
    facility: str
    level: int = Field(ge=1, le=4)
    client_id: str = Field(min_length=8, max_length=64)  # UUID anonyme généré par l'app


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/reports", status_code=201)
def create_report(report: ReportIn):
    if report.facility not in FACILITIES:
        raise HTTPException(404, "Salle inconnue")
    now = int(time.time())
    with closing(get_db()) as conn:
        recent = conn.execute(
            "SELECT 1 FROM reports WHERE facility=? AND client_id=? AND ts>?",
            (report.facility, report.client_id, now - COOLDOWN_SECONDS),
        ).fetchone()
        if recent:
            raise HTTPException(429, "Tu as déjà signalé récemment, réessaie plus tard")
        conn.execute(
            "INSERT INTO reports (facility, level, client_id, ts) VALUES (?,?,?,?)",
            (report.facility, report.level, report.client_id, now),
        )
        conn.commit()
    return {"status": "enregistré"}


@app.get("/occupancy/{facility}")
def get_occupancy(facility: str):
    if facility not in FACILITIES:
        raise HTTPException(404, "Salle inconnue")
    since = int(time.time()) - WINDOW_SECONDS
    with closing(get_db()) as conn:
        row = conn.execute(
            "SELECT AVG(level) AS avg_level, COUNT(*) AS n, MAX(ts) AS last_ts"
            " FROM reports WHERE facility=? AND ts>=?",
            (facility, since),
        ).fetchone()
    if row["n"] == 0:
        return {
            "facility": facility,
            "level": None,
            "label": "Pas de données",
            "reports": 0,
            "last_report_ts": None,
        }
    level = round(row["avg_level"])
    return {
        "facility": facility,
        "level": level,
        "label": LABELS[level],
        "reports": row["n"],
        "last_report_ts": row["last_ts"],  # champ additif (phase 2) : epoch du dernier signalement
    }
