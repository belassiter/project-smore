"""create_tip_openings_view

Revision ID: 8ebd6bbf4b9d
Revises: 019870c9e5ab
Create Date: 2026-02-08 16:25:58.834142

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ebd6bbf4b9d'
down_revision: Union[str, Sequence[str], None] = '019870c9e5ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
    CREATE OR REPLACE VIEW view_ref_tip_openings_full AS
    SELECT
        t.id as tip_opening_id,
        m.manufacturer,
        m.model,
        m.variant,
        t.label,
        t.opening_inch,
        t.facing_length,
        t.data_source
    FROM
        ref_tip_openings t
    JOIN
        ref_mouthpieces m ON t.mouthpiece_id = m.id;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP VIEW IF EXISTS view_ref_tip_openings_full")
