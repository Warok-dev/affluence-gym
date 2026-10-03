import os
import tempfile

import pytest

# Before any `import app`: isolated database, no background task during tests.
os.environ.setdefault("DB_PATH", os.path.join(tempfile.mkdtemp(), "test.db"))
os.environ["SNAPSHOT_ENABLED"] = "false"


@pytest.fixture(autouse=True)
def _fresh_rate_limit():
    # Every test starts with an empty per-IP write counter.
    from app.ratelimit import write_limiter

    write_limiter.reset()
