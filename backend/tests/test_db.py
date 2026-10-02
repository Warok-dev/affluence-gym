import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from app import config

BACKEND = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgres://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql://u:p@host/db?sslmode=require", "postgresql+psycopg://u:p@host/db?sslmode=require"),
        ("postgresql+psycopg://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
    ],
)
def test_database_url_uses_psycopg(monkeypatch, url, expected):
    monkeypatch.setenv("DATABASE_URL", url)
    assert config._database_url() == expected


def test_database_url_defaults_to_sqlite(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr(config, "DB_PATH", "x.db")
    assert config._database_url() == "sqlite:///x.db"


def test_phase2_database_is_upgraded_without_losing_reports(tmp_path):
    """A database created by the phase 2 code (sqlite3, `reports` only) keeps its rows."""
    db = tmp_path / "legacy.db"
    with sqlite3.connect(db) as conn:
        conn.execute(
            "CREATE TABLE reports (id INTEGER PRIMARY KEY AUTOINCREMENT, facility TEXT NOT NULL,"
            " level INTEGER NOT NULL, client_id TEXT NOT NULL, ts INTEGER NOT NULL)"
        )
        conn.execute("INSERT INTO reports (facility, level, client_id, ts) VALUES ('minto', 3, 'abcdefgh', 1)")

    env = {k: v for k, v in os.environ.items() if k != "DATABASE_URL"}
    env.update(DB_PATH=str(db), SNAPSHOT_ENABLED="false")
    subprocess.run([sys.executable, "-c", "import app.main"], cwd=BACKEND, env=env, check=True)

    with sqlite3.connect(db) as conn:
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"reports", "occupancy_snapshots", "alembic_version"} <= tables
        assert conn.execute("SELECT version_num FROM alembic_version").fetchone() == ("0001",)
        assert conn.execute("SELECT COUNT(*) FROM reports").fetchone() == (1,)
