"""Official counter: turnstile readings and people count on snapshots

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "official_counts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("facility", sa.String(32), nullable=False),
        sa.Column("ts", sa.BigInteger(), nullable=False),
        sa.Column("entries", sa.Integer(), nullable=False),
        sa.Column("exits", sa.Integer(), nullable=True),
    )
    op.create_index("idx_official_fac_ts", "official_counts", ["facility", "ts"])
    with op.batch_alter_table("occupancy_snapshots") as batch:
        batch.add_column(sa.Column("people", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("occupancy_snapshots") as batch:
        batch.drop_column("people")
    op.drop_index("idx_official_fac_ts", table_name="official_counts")
    op.drop_table("official_counts")
