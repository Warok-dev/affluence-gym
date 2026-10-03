"""Turnstile counter SIMULATOR, for demos only: the numbers are invented.

Plays the role of the university's system: every few seconds it sends each gym's
cumulative entry/exit counters to the API, through the same secured endpoint the
real integration would use (POST /official/{facility}/counts, X-Api-Key header).

    $env:OFFICIAL_API_KEY = "demo-key"          # same value as the API's
    python scripts/simulate_counter.py           # entries and exits (exact count)
    python scripts/simulate_counter.py --no-exits    # entries only (estimated count)
    python scripts/simulate_counter.py --hour 18     # crowd of 18:00, whatever the time

Run the API with DEMO_DATA=true so the app labels these figures as demonstration data.
"""

import argparse
import json
import math
import os
import random
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import TIMEZONE  # noqa: E402
from app.facilities import FACILITIES  # noqa: E402

# Share of capacity typically present, by hour (weekday / weekend).
WEEKDAY = {6: 0.12, 7: 0.2, 8: 0.25, 9: 0.25, 10: 0.3, 11: 0.45, 12: 0.55, 13: 0.5, 14: 0.35,
           15: 0.4, 16: 0.6, 17: 0.85, 18: 0.9, 19: 0.8, 20: 0.55, 21: 0.35, 22: 0.15}  # fmt: skip
WEEKEND = {8: 0.15, 9: 0.25, 10: 0.4, 11: 0.5, 12: 0.55, 13: 0.5, 14: 0.45, 15: 0.4, 16: 0.35,
           17: 0.3, 18: 0.2, 19: 0.1}  # fmt: skip
STAY_MINUTES = 75


def target_people(facility: str, now: datetime) -> float:
    table = WEEKDAY if now.weekday() < 5 else WEEKEND
    share = table.get(now.hour, 0.0)
    nxt = table.get(now.hour + 1, 0.0)
    share += (nxt - share) * now.minute / 60  # smooth between hours
    bias = 1.0 if facility == "minto" else 0.75  # the two gyms differ, as they would in reality
    return FACILITIES[facility].capacity * share * bias


class Counter:
    """Cumulative counters since midnight, with a plausible crowd inside."""

    def __init__(self, facility: str, now: datetime, rng: random.Random) -> None:
        self.facility = facility
        self.rng = rng
        self.present = round(target_people(facility, now))
        # Visits so far today: roughly hours open * hourly turnover.
        opened = max(0.0, now.hour + now.minute / 60 - 6.5)
        self.exits = round(opened * 60 / STAY_MINUTES * self.present * 0.8)
        self.entries = self.exits + self.present

    def step(self, now: datetime, seconds: float) -> None:
        # Departures follow the average stay; arrivals pull the crowd towards the hourly target.
        leave_rate = self.present * seconds / (STAY_MINUTES * 60)
        gap = target_people(self.facility, now) - self.present
        arrive_rate = max(0.0, leave_rate + gap * seconds / 600)
        arrivals, departures = self._poisson(arrive_rate), min(self.present, self._poisson(leave_rate))
        self.entries += arrivals
        self.exits += departures
        self.present += arrivals - departures

    def _poisson(self, lam: float) -> int:
        limit, k, p = math.exp(-lam), 0, 1.0
        while True:
            p *= self.rng.random()
            if p <= limit:
                return k
            k += 1


def send(api: str, key: str, facility: str, entries: int, exits: int | None) -> int:
    body = json.dumps({"entries": entries, "exits": exits}).encode()
    request = urllib.request.Request(
        f"{api}/official/{facility}/counts",
        data=body,
        headers={"Content-Type": "application/json", "X-Api-Key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status
    except urllib.error.HTTPError as err:
        return err.code


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--interval", type=float, default=5.0, help="seconds between readings")
    parser.add_argument("--no-exits", action="store_true", help="simulate a gym without an exit counter")
    parser.add_argument("--once", action="store_true", help="send one reading per gym and stop")
    parser.add_argument("--hour", type=int, help="simulate the crowd of this hour (demo at any time of day)")
    args = parser.parse_args()
    key = os.getenv("OFFICIAL_API_KEY", "")
    if not key:
        sys.exit("Set OFFICIAL_API_KEY (same value as the API's).")

    def clock() -> datetime:
        now = datetime.now(TIMEZONE)
        return now.replace(hour=args.hour) if args.hour is not None else now

    rng = random.Random()
    counters = {fid: Counter(fid, clock(), rng) for fid in FACILITIES}
    print("Simulated counters (fictitious) -> " + args.api)
    while True:
        now = clock()
        for fid, counter in counters.items():
            counter.step(now, args.interval)
            exits = None if args.no_exits else counter.exits
            status = send(args.api, key, fid, counter.entries, exits)
            print(
                f"{now:%H:%M:%S} {fid:<10} entries={counter.entries:<5} exits={exits!s:<5} "
                f"present={counter.present:<4} HTTP {status}"
            )
        if args.once:
            break
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
