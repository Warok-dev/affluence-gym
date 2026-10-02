"""Training, model selection and serving of the forecast.

The model is retrained in memory from the snapshots (no artifact on disk: the free
host has no persistent storage, and training takes well under a second at this
data size). Model selection is automatic: every candidate is scored on the last
VALIDATION_DAYS (time-based split, never shuffled), the best MAE wins, and the
winner is refitted on all the data.
"""

import threading
import time
from dataclasses import dataclass, field
from datetime import datetime

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import TIMEZONE
from ..db import OccupancySnapshot
from ..facilities import FACILITIES
from ..history import opening_hour_range
from .models import CALM_MAX_LEVEL, MODELS, metrics

HISTORY_WEEKS = 26  # training window
VALIDATION_DAYS = 14
MIN_GBM_SAMPLES = 500  # below this, only the baseline is considered
RETRAIN_SECONDS = 24 * 3600


@dataclass
class Dataset:
    facilities: list[str]
    ts: np.ndarray
    y: np.ndarray

    def __len__(self) -> int:
        return len(self.y)

    def subset(self, mask: np.ndarray) -> "Dataset":
        return Dataset([f for f, m in zip(self.facilities, mask, strict=True) if m], self.ts[mask], self.y[mask])


def load_dataset(session: Session, now: int, weeks: int = HISTORY_WEEKS) -> Dataset:
    rows = session.execute(
        select(OccupancySnapshot.facility, OccupancySnapshot.ts, OccupancySnapshot.level)
        .where(OccupancySnapshot.ts >= now - weeks * 7 * 86400, OccupancySnapshot.facility.in_(FACILITIES))
        .order_by(OccupancySnapshot.ts)
    ).all()
    return Dataset(
        [r.facility for r in rows],
        np.array([r.ts for r in rows], dtype=np.int64),
        np.array([r.level for r in rows], dtype=float),
    )


@dataclass
class TrainedForecaster:
    model: object
    name: str
    trained_at: int
    samples: int
    validation: dict[str, dict[str, float]] = field(default_factory=dict)


def train(ds: Dataset, now: int) -> TrainedForecaster | None:
    if len(ds) == 0:
        return None
    cutoff = now - VALIDATION_DAYS * 86400
    is_train = ds.ts < cutoff
    train_ds, val_ds = ds.subset(is_train), ds.subset(~is_train)

    candidates = ["baseline"]
    if len(train_ds) >= MIN_GBM_SAMPLES and len(val_ds) > 0:
        candidates.append("gbm")

    validation: dict[str, dict[str, float]] = {}
    if len(train_ds) > 0 and len(val_ds) > 0:
        for name in candidates:
            model = MODELS[name]().fit(train_ds.facilities, train_ds.ts, train_ds.y)
            validation[name] = metrics(val_ds.y, model.predict(val_ds.facilities, val_ds.ts))
        best = min(validation, key=lambda n: validation[n]["mae"])
    else:
        best = "baseline"  # not enough history to validate anything else

    model = MODELS[best]().fit(ds.facilities, ds.ts, ds.y)
    return TrainedForecaster(model=model, name=best, trained_at=now, samples=len(ds), validation=validation)


@dataclass(frozen=True)
class HourForecast:
    ts: int  # start of the hour (epoch seconds)
    hour: int  # local hour
    level: float
    calm: bool


def forecast(trained: TrainedForecaster, facility: str, now: int, hours: int) -> list[HourForecast]:
    """Predicted level for each of the next `hours` whole hours when the gym is open.

    The hour's level is the mean of the predictions at :00, :15, :30 and :45,
    matching how snapshots are taken.
    """
    start = now - now % 3600 + 3600
    slots: list[tuple[int, int]] = []
    for i in range(hours):
        ts = start + i * 3600
        local = datetime.fromtimestamp(ts, TIMEZONE)
        opening = FACILITIES[facility].opening_hours[local.weekday()]
        if opening and local.hour in opening_hour_range(*opening):
            slots.append((ts, local.hour))
    if not slots:
        return []
    quarter_ts = np.array([ts + q * 900 for ts, _ in slots for q in range(4)], dtype=np.int64)
    preds = trained.model.predict([facility] * len(quarter_ts), quarter_ts).reshape(-1, 4).mean(axis=1)
    return [
        HourForecast(ts=ts, hour=hour, level=round(float(p), 2), calm=bool(p <= CALM_MAX_LEVEL))
        for (ts, hour), p in zip(slots, preds, strict=True)
    ]


class ForecastService:
    """Keeps the current model in memory and retrains it once a day."""

    def __init__(self) -> None:
        self._trained: TrainedForecaster | None = None
        self._lock = threading.Lock()

    def reset(self) -> None:
        with self._lock:
            self._trained = None

    def retrain(self, session: Session, now: int | None = None) -> TrainedForecaster | None:
        now = int(time.time()) if now is None else now
        trained = train(load_dataset(session, now), now)
        with self._lock:
            self._trained = trained
        return trained

    def get(self, session: Session, now: int | None = None) -> TrainedForecaster | None:
        now = int(time.time()) if now is None else now
        with self._lock:
            trained = self._trained
        if trained is None or now - trained.trained_at >= RETRAIN_SECONDS:
            trained = self.retrain(session, now)
        return trained


forecast_service = ForecastService()
