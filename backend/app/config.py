"""Settings read from environment variables (see README)."""

import os
from zoneinfo import ZoneInfo

DB_PATH = os.getenv("DB_PATH", "affluence.db")


def _database_url() -> str:
    """DATABASE_URL (PostgreSQL in production) takes precedence over DB_PATH (SQLite).

    Hosts such as Neon or Render hand out "postgres://" / "postgresql://" URLs;
    point them at the psycopg 3 driver used by this project.
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        return f"sqlite:///{DB_PATH}"
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


DATABASE_URL = _database_url()

WINDOW_SECONDS = 30 * 60  # on moyenne les signalements des 30 dernières minutes
COOLDOWN_SECONDS = 15 * 60  # 1 signalement par personne, par salle, par 15 min
SNAPSHOT_SECONDS = 15 * 60  # un snapshot par salle tous les quarts d'heure

# Local time of the gyms: weekdays, hours and opening hours are all expressed in it.
TIMEZONE = ZoneInfo(os.getenv("TIMEZONE", "America/Toronto"))

# Periodic snapshot task inside the API process (disable it if an external cron
# runs `python -m app.snapshot` instead).
SNAPSHOT_ENABLED = os.getenv("SNAPSHOT_ENABLED", "true").lower() in {"1", "true", "yes"}

# Set when the database holds the synthetic data of scripts/seed_demo.py: the app then
# labels every figure as demonstration data (PRODUCT.md: never present it as real).
DEMO_DATA = os.getenv("DEMO_DATA", "false").lower() in {"1", "true", "yes"}

# Origines autorisées (séparées par des virgules) ; par défaut le serveur de dev Vite.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

LABELS = {1: "Vide", 2: "Calme", 3: "Modéré", 4: "Bondé"}
