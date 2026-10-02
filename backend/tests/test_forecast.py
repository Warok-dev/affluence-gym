from datetime import date, datetime

import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.config import TIMEZONE
from app.db import OccupancySnapshot, Report, SessionLocal
from app.facilities import FACILITIES
from app.forecast import evaluate, service
from app.forecast.features import build_matrix, is_exam, is_holiday
from app.forecast.models import BaselineModel, GradientBoostingModel, metrics
from app.history import opening_hour_range
from app.main import app

client = TestClient(app)


def local_ts(*args: int) -> int:
    return int(datetime(*args, tzinfo=TIMEZONE).timestamp())


# Tuesday 2026-10-20, 13:20 in Toronto. The last 14 days include Thanksgiving (Mon 2026-10-12).
NOW = local_ts(2026, 10, 20, 13, 20)


def synthetic_level(ts: int) -> float:
    """Quiet mornings, evening rush, quieter weekends, empty gym on public holidays."""
    local = datetime.fromtimestamp(ts, TIMEZONE)
    if is_holiday(local.date()):
        return 1.0
    level = 1 if local.hour < 9 else 2 if local.hour < 16 else 4 if local.hour < 20 else 3
    return float(max(1, level - (local.weekday() >= 5)))


def synthetic_dataset(weeks: int, now: int = NOW, facility: str = "minto") -> service.Dataset:
    ts = []
    for t in range(now - weeks * 7 * 86400, now, 900):
        local = datetime.fromtimestamp(t, TIMEZONE)
        opening = FACILITIES[facility].opening_hours[local.weekday()]
        if opening and local.hour in opening_hour_range(*opening):
            ts.append(t)
    arr = np.array(ts, dtype=np.int64)
    return service.Dataset([facility] * len(arr), arr, np.array([synthetic_level(t) for t in arr]))


@pytest.fixture(autouse=True)
def clean_state():
    service.forecast_service.reset()
    with SessionLocal() as s:
        s.execute(delete(Report))
        s.execute(delete(OccupancySnapshot))
        s.commit()
        yield s
    service.forecast_service.reset()


# --- features ----------------------------------------------------------------


def test_calendar_features():
    assert is_holiday(date(2026, 10, 12))  # Thanksgiving, Ontario
    assert not is_holiday(date(2026, 10, 13))
    assert is_exam(date(2026, 12, 15)) and not is_exam(date(2026, 11, 15))
    row = build_matrix(["montpetit"], [local_ts(2026, 10, 12, 18, 30)])[0]
    facility, weekday, hour, _, _, weekend, holiday, exam = row
    assert (facility, weekday, hour, weekend, holiday, exam) == (1, 0, 18.5, 0, 1, 0)


# --- models ------------------------------------------------------------------


def test_baseline_falls_back_from_weekday_hour_to_hour_to_global():
    monday_7h = local_ts(2026, 10, 19, 7, 0)
    model = BaselineModel().fit(["minto", "minto"], np.array([monday_7h, monday_7h + 900]), np.array([1.0, 2.0]))
    tuesday_7h = monday_7h + 86400
    monday_18h = monday_7h + 11 * 3600
    pred = model.predict(["minto", "minto", "montpetit"], np.array([monday_7h, tuesday_7h, monday_18h]))
    assert pred.tolist() == [1.5, 1.5, 1.5]  # exact, (facility, hour), then global mean


def test_metrics():
    m = metrics(np.array([1.0, 2.0, 4.0, 3.0]), np.array([1.0, 3.0, 4.0, 2.0]))
    assert m["mae"] == 0.5 and m["level_accuracy"] == 0.5
    assert m["calm_f1"] == 0.5  # precision 1/2, recall 1/2


def test_gradient_boosting_predictions_stay_in_range():
    ds = synthetic_dataset(weeks=4)
    pred = GradientBoostingModel().fit(ds.facilities, ds.ts, ds.y).predict(ds.facilities, ds.ts)
    assert pred.min() >= 1 and pred.max() <= 4


# --- training & model selection ----------------------------------------------


def test_train_without_data_returns_none():
    assert service.train(synthetic_dataset(weeks=0), NOW) is None


def test_train_with_little_history_uses_baseline_only():
    trained = service.train(synthetic_dataset(weeks=1), NOW)
    assert trained.name == "baseline"
    assert set(trained.validation) <= {"baseline"}


def test_train_selects_gradient_boosting_when_it_learns_holidays():
    trained = service.train(synthetic_dataset(weeks=10), NOW)
    v = trained.validation
    assert set(v) == {"baseline", "gbm"}
    assert v["gbm"]["mae"] < v["baseline"]["mae"]
    assert trained.name == "gbm"
    # The selected model is refitted on all the data, Thanksgiving included.
    thanksgiving_18h = local_ts(2026, 10, 12, 18, 0)
    assert trained.model.predict(["minto"], np.array([thanksgiving_18h]))[0] < 2


def test_forecast_covers_next_open_hours_only():
    trained = service.train(synthetic_dataset(weeks=10), NOW)
    late = local_ts(2026, 10, 20, 21, 10)  # Tuesday, closes at 23:00
    points = service.forecast(trained, "minto", late, hours=12)
    assert [p.hour for p in points] == [22, 6, 7, 8, 9]  # 22 h -> 9 h, closed from 23 h to 6 h
    assert all(p.ts % 3600 == 0 for p in points)
    by_hour = {p.hour: p for p in points}
    assert by_hour[7].calm and by_hour[7].level == pytest.approx(1, abs=0.3)
    assert not by_hour[22].calm


def test_service_caches_and_retrains_daily(clean_state, monkeypatch):
    calls = []
    real_train = service.train
    monkeypatch.setattr(service, "train", lambda ds, now: calls.append(now) or real_train(ds, now))
    session = clean_state
    session.add(OccupancySnapshot(facility="minto", ts=NOW - 3600, level=2, source="crowd"))
    session.commit()

    first = service.forecast_service.get(session, NOW)
    assert service.forecast_service.get(session, NOW + 3600) is first
    service.forecast_service.get(session, NOW + service.RETRAIN_SECONDS)
    assert calls == [NOW, NOW + service.RETRAIN_SECONDS]


# --- offline evaluation --------------------------------------------------------


def test_backtest_report():
    ds = synthetic_dataset(weeks=10)
    results = evaluate.backtest(ds, NOW, folds=2, fold_days=7)
    assert len(results["baseline"]) == len(results["gbm"]) == 2
    text = evaluate.report(results, len(ds))
    assert "| baseline |" in text and "| gbm |" in text


# --- endpoint ------------------------------------------------------------------


def test_forecast_endpoint_without_history():
    data = client.get("/forecast/minto").json()
    assert data["available"] is False and data["hours"] == [] and data["next_calm"] is None


def test_forecast_endpoint(clean_state):
    import time

    now = int(time.time())
    ds = synthetic_dataset(weeks=3, now=now)
    clean_state.add_all(
        OccupancySnapshot(facility=f, ts=int(t), level=int(y), source="crowd")
        for f, t, y in zip(ds.facilities, ds.ts, ds.y, strict=True)
    )
    clean_state.commit()

    data = client.get("/forecast/minto?hours=24").json()
    assert data["available"] is True
    assert data["model"] in {"baseline", "gbm"}
    assert data["training_samples"] == len(ds)
    assert 0 < len(data["hours"]) <= 24
    assert set(data["hours"][0]) == {"ts", "hour", "level", "calm"}
    calm = [h for h in data["hours"] if h["calm"]]
    assert data["next_calm"] == ({"ts": calm[0]["ts"], "hour": calm[0]["hour"]} if calm else None)


def test_forecast_endpoint_validation():
    assert client.get("/forecast/nope").status_code == 404
    assert client.get("/forecast/minto?hours=0").status_code == 422
    assert client.get("/forecast/minto?hours=49").status_code == 422
