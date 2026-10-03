"""Per-IP limit on write requests (anti-abuse).

The anonymous client_id is trivial to change, so the cooldowns alone do not stop a script.
This sliding window caps the writes of one IP address. It is generous on purpose: many
students can share one campus address (NAT), and a real person sends a handful of writes.
In memory, per process: enough for the single free instance; it resets on restart.
"""

import time
from collections import deque

from fastapi import HTTPException, Request

from . import config


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}

    def allow(self, key: str, now: float, limit: int, window: int) -> bool:
        hits = self._hits.setdefault(key, deque())
        while hits and hits[0] <= now - window:
            hits.popleft()
        if len(hits) >= limit:
            return False
        hits.append(now)
        # Forget idle addresses now and then, so memory stays bounded.
        if len(self._hits) > 10_000:
            self._hits = {k: v for k, v in self._hits.items() if v and v[-1] > now - window}
        return True

    def reset(self) -> None:
        self._hits.clear()


write_limiter = RateLimiter()


def limit_writes(request: Request) -> None:
    """FastAPI dependency for the public write endpoints. The client address comes from the
    proxy's X-Forwarded-For header in production (uvicorn --proxy-headers)."""
    ip = request.client.host if request.client else "unknown"
    if not write_limiter.allow(ip, time.monotonic(), config.WRITE_RATE_LIMIT, config.WRITE_RATE_WINDOW_SECONDS):
        raise HTTPException(
            429,
            "Trop de requêtes depuis cette adresse, réessaie dans quelques minutes",
            headers={"Retry-After": str(config.WRITE_RATE_WINDOW_SECONDS)},
        )
