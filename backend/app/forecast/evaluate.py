"""Offline evaluation: rolling-origin backtest of every model.

    python -m app.forecast.evaluate [--folds 4] [--fold-days 7]

For each fold, models are trained on everything before the fold's start and
tested on the following `fold-days` days, exactly as in production (no peeking
at the future). Prints a Markdown report (see docs/forecast-evaluation.md).
"""

import argparse
import sys
import time

import numpy as np

from ..db import SessionLocal
from .models import MODELS, metrics
from .service import Dataset, load_dataset

METRICS = ("mae", "rmse", "level_accuracy", "calm_f1")


def backtest(ds: Dataset, now: int, folds: int, fold_days: int) -> dict[str, list[dict[str, float]]]:
    results: dict[str, list[dict[str, float]]] = {name: [] for name in MODELS}
    for k in range(folds, 0, -1):
        start = now - k * fold_days * 86400
        end = start + fold_days * 86400
        train_ds = ds.subset(ds.ts < start)
        test_ds = ds.subset((ds.ts >= start) & (ds.ts < end))
        if len(train_ds) == 0 or len(test_ds) == 0:
            continue
        for name, cls in MODELS.items():
            pred = cls().fit(train_ds.facilities, train_ds.ts, train_ds.y).predict(test_ds.facilities, test_ds.ts)
            results[name].append({**metrics(test_ds.y, pred), "n_train": len(train_ds), "n_test": len(test_ds)})
    return results


def report(results: dict[str, list[dict[str, float]]], samples: int) -> str:
    folds = max((len(r) for r in results.values()), default=0)
    lines = [
        f"Snapshots: {samples} · folds: {folds}",
        "",
        "| Model | MAE ↓ | RMSE ↓ | Level accuracy ↑ | Calm F1 ↑ |",
        "|---|---|---|---|---|",
    ]
    for name, rows in results.items():
        if not rows:
            continue
        means = {m: np.mean([r[m] for r in rows]) for m in METRICS}
        lines.append(
            f"| {name} | {means['mae']:.3f} | {means['rmse']:.3f} | "
            f"{means['level_accuracy']:.1%} | {means['calm_f1']:.3f} |"
        )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--folds", type=int, default=4)
    parser.add_argument("--fold-days", type=int, default=7)
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")  # the report has non-ASCII symbols (Windows consoles)
    # Read-only on purpose (no init_db / migrations): safe to point at a production copy.
    now = int(time.time())
    with SessionLocal() as session:
        ds = load_dataset(session, now)
    if len(ds) == 0:
        print("No snapshots: nothing to evaluate.")
        return
    print(report(backtest(ds, now, args.folds, args.fold_days), len(ds)))


if __name__ == "__main__":
    main()
