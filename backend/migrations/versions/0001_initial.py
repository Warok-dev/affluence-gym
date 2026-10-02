"""Initial schema: reports and occupancy_snapshots

Revision ID: 0001
Revises:
Create Date: 2026-10-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("facility", sa.String(32), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
    )
    op.create_index("idx_fac_ts", "reports", ["facility", "ts"])
    op.create_table(
        "occupancy_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("facility", sa.String(32), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.UniqueConstraint("facility", "ts", "source", name="uq_snapshot"),
    )


def downgrade() -> None:
    op.drop_table("occupancy_snapshots")
    op.drop_index("idx_fac_ts", table_name="reports")
    op.drop_table("reports")
