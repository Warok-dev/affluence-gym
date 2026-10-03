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
# Anti-abuse: writes (reports, equipment reports, alerts) per IP address and window.
# Generous, because a whole campus can share one address.
WRITE_RATE_LIMIT = int(os.getenv("WRITE_RATE_LIMIT", "120"))
WRITE_RATE_WINDOW_SECONDS = int(os.getenv("WRITE_RATE_WINDOW_SECONDS", str(10 * 60)))
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

# --- Official counter (entries at the card-gated turnstile, exits at the exit turnstile) ---
# Shared secret the university's system sends in the X-Api-Key header. Empty: ingestion disabled.
OFFICIAL_API_KEY = os.getenv("OFFICIAL_API_KEY", "")
# A counter silent for longer than this is considered down: the app falls back to crowd reports.
OFFICIAL_STALE_SECONDS = int(os.getenv("OFFICIAL_STALE_SECONDS", str(10 * 60)))
# Without exit counts, presence is estimated as the entries of the last AVERAGE_STAY minutes.
AVERAGE_STAY_SECONDS = int(os.getenv("AVERAGE_STAY_MINUTES", "75")) * 60
# --- Notifications (Web Push) ---
# VAPID keys (generate with scripts/generate_vapid_keys.py). Without both, notifications are disabled.
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
# Contact the push services can reach (required by the Web Push protocol), e.g. mailto:you@example.com
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "")
ALERT_CHECK_SECONDS = int(os.getenv("ALERT_CHECK_SECONDS", "120"))

# Occupancy ratio (people / capacity) upper bounds for levels 1-3; above the last one is level 4.
LEVEL_RATIOS = (0.25, 0.5, 0.75)
