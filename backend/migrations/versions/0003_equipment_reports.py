"""Equipment status reports

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "equipment_reports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("facility", sa.String(32), nullable=False),
        sa.Column("equipment_id", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("client_id", sa.String(64), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
    )
    op.create_index("idx_equipment_fac_ts", "equipment_reports", ["facility", "ts"])


def downgrade() -> None:
    op.drop_index("idx_equipment_fac_ts", table_name="equipment_reports")
    op.drop_table("equipment_reports")
