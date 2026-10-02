"""Database models and session handling (SQLAlchemy 2)."""

from collections.abc import Iterator
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import (
    BigInteger,
    Column,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    UniqueConstraint,
    create_engine,
    inspect,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .config import DATABASE_URL


class Base(DeclarativeBase):
    pass


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (Index("idx_fac_ts", "facility", "ts"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility: Mapped[str] = mapped_column(String(32))
    level: Mapped[int] = mapped_column(Integer)
    client_id: Mapped[str] = mapped_column(String(64))
    ts: Mapped[int] = mapped_column(BigInteger)  # epoch seconds


class OccupancySnapshot(Base):
    """Occupancy recorded every quarter hour, for history and future forecasts."""

    __tablename__ = "occupancy_snapshots"
    __table_args__ = (UniqueConstraint("facility", "ts", "source", name="uq_snapshot"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility: Mapped[str] = mapped_column(String(32))
    ts: Mapped[int] = mapped_column(BigInteger)  # epoch seconds, floored to the quarter hour
    level: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(16))  # "crowd" or "official"
    people: Mapped[int | None] = mapped_column(Integer, nullable=True)  # official source only


class OfficialCount(Base):
    """A reading of the gym's turnstile counters, as sent by the university's system.

    Counters are cumulative since midnight (gym local time); `exits` is null when the
    exit turnstile has no counter. Aggregates only: no card number, no identity.
    """

    __tablename__ = "official_counts"
    __table_args__ = (Index("idx_official_fac_ts", "facility", "ts"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility: Mapped[str] = mapped_column(String(32))
    ts: Mapped[int] = mapped_column(BigInteger)  # epoch seconds of the reading
    entries: Mapped[int] = mapped_column(Integer)
    exits: Mapped[int | None] = mapped_column(Integer, nullable=True)


_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
# pool_pre_ping: serverless Postgres (Neon) closes idle connections when it scales to zero.
engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def alembic_config() -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("script_location", str(ALEMBIC_INI.parent / "migrations"))
    return cfg


def init_db() -> None:
    """Bring the schema up to date with Alembic migrations.

    Databases created before Alembic (phase 2: `reports` only; phase 3: both tables)
    are completed with the tables of the first revision, then stamped at it.
    """
    cfg = alembic_config()
    tables = set(inspect(engine).get_table_names())
    if "alembic_version" not in tables and "reports" in tables:
        # Complete it to exactly the 0001 schema (not today's models), so that the
        # later revisions apply on top of it as they would on any other database.
        if "occupancy_snapshots" not in tables:
            _SNAPSHOTS_0001.create(engine)
        command.stamp(cfg, "0001")
    command.upgrade(cfg, "head")


# occupancy_snapshots as created by revision 0001, for databases that predate Alembic.
_SNAPSHOTS_0001 = Table(
    "occupancy_snapshots",
    MetaData(),
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("facility", String(32), nullable=False),
    Column("ts", BigInteger, nullable=False),
    Column("level", Integer, nullable=False),
    Column("source", String(16), nullable=False),
    UniqueConstraint("facility", "ts", "source", name="uq_snapshot"),
)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
