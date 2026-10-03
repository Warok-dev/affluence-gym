"""One-shot quiet-gym alerts (Web Push)

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("facility", sa.String(32), nullable=False),
        sa.Column("endpoint", sa.String(1024), nullable=False),
        sa.Column("p256dh", sa.String(256), nullable=False),
        sa.Column("auth", sa.String(64), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("created_ts", sa.BigInteger(), nullable=False),
        sa.Column("expires_ts", sa.BigInteger(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("alerts")
