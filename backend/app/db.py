"""Database models and session handling (SQLAlchemy 2)."""

from collections.abc import Iterator

from sqlalchemy import Index, Integer, String, UniqueConstraint, create_engine
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
    ts: Mapped[int] = mapped_column(Integer)  # epoch seconds


class OccupancySnapshot(Base):
    """Occupancy recorded every quarter hour, for history and future forecasts."""

    __tablename__ = "occupancy_snapshots"
    __table_args__ = (UniqueConstraint("facility", "ts", "source", name="uq_snapshot"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility: Mapped[str] = mapped_column(String(32))
    ts: Mapped[int] = mapped_column(Integer)  # epoch seconds, floored to the quarter hour
    level: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(16))  # "crowd" today, "official" later


_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def init_db() -> None:
    # Phase 4 replaces this with Alembic migrations (needed for PostgreSQL).
    Base.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
