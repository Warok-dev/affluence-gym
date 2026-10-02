"""Forecasting models. All predict an average level (1-4) for (facility, timestamp)."""

from collections import defaultdict
from typing import Protocol

import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

from .features import build_matrix

CALM_MAX_LEVEL = 2.0


class Model(Protocol):
    name: str

    def fit(self, facilities: list[str], ts: np.ndarray, y: np.ndarray) -> "Model": ...

    def predict(self, facilities: list[str], ts: np.ndarray) -> np.ndarray: ...


class BaselineModel:
    """Mean level per (facility, weekday, hour), falling back to (facility, hour),
    then facility, then global mean. This is what the "typical day" chart shows."""

    name = "baseline"

    def fit(self, facilities, ts, y):
        X = build_matrix(facilities, ts)
        sums: dict[tuple, list[float]] = defaultdict(lambda: [0.0, 0])
        for (fac, wd, hour, *_), level in zip(X, y, strict=True):
            for key in ((fac, wd, int(hour)), (fac, int(hour)), (fac,), ()):
                sums[key][0] += level
                sums[key][1] += 1
        self._means = {k: s / n for k, (s, n) in sums.items()}
        return self

    def predict(self, facilities, ts):
        X = build_matrix(facilities, ts)
        out = []
        for fac, wd, hour, *_ in X:
            for key in ((fac, wd, int(hour)), (fac, int(hour)), (fac,), ()):
                if key in self._means:
                    out.append(self._means[key])
                    break
        return np.array(out)


class GradientBoostingModel:
    """Gradient boosting on calendar features (weekday, hour, holidays, exams)."""

    name = "gbm"

    def __init__(self) -> None:
        self._model = HistGradientBoostingRegressor(
            categorical_features=[0],  # facility
            max_iter=300,
            learning_rate=0.05,
            max_leaf_nodes=15,
            min_samples_leaf=20,
            l2_regularization=1.0,
            random_state=0,
        )

    def fit(self, facilities, ts, y):
        self._model.fit(build_matrix(facilities, ts), y)
        return self

    def predict(self, facilities, ts):
        return np.clip(self._model.predict(build_matrix(facilities, ts)), 1.0, 4.0)


MODELS: dict[str, type[Model]] = {"baseline": BaselineModel, "gbm": GradientBoostingModel}


def metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """MAE/RMSE on the level, accuracy of the rounded level, F1 of the "calm" class."""
    err = y_pred - y_true
    true_calm, pred_calm = y_true <= CALM_MAX_LEVEL, y_pred <= CALM_MAX_LEVEL
    tp = float(np.sum(true_calm & pred_calm))
    precision = tp / max(1.0, float(np.sum(pred_calm)))
    recall = tp / max(1.0, float(np.sum(true_calm)))
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "mae": round(float(np.mean(np.abs(err))), 4),
        "rmse": round(float(np.sqrt(np.mean(err**2))), 4),
        "level_accuracy": round(float(np.mean(np.round(y_pred) == y_true)), 4),
        "calm_f1": round(f1, 4),
    }
