"""add_instrument_type_to_ref_tables

Revision ID: 49bbb0badddf
Revises: 8ebd6bbf4b9d
Create Date: 2026-02-08 19:22:34.567754

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49bbb0badddf'
down_revision: Union[str, Sequence[str], None] = '8ebd6bbf4b9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Since 'instrumenttype' enum already exists in Postgres (used by player_submissions),
    # we can use explicit casting or just recreate the definition for SQLAlchemy's benefit.
    instrument_enum = sa.Enum('SOPRANINO', 'SOPRANO', 'ALTO', 'TENOR', 'BARITONE', 'BASS', 'CONTRABASS', name='instrumenttype')
    
    op.add_column('ref_tip_openings', sa.Column('instrument', instrument_enum, nullable=True))
    op.add_column('ref_reeds', sa.Column('instrument', instrument_enum, nullable=True))


    # Update the View to include instrument
    op.execute("DROP VIEW IF EXISTS view_ref_tip_openings_full")
    op.execute("""
    CREATE VIEW view_ref_tip_openings_full AS
    SELECT
        t.id as tip_opening_id,
        m.manufacturer,
        m.model,
        m.variant,
        t.instrument,
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
    # Recreate old view
    op.execute("""
    CREATE VIEW view_ref_tip_openings_full AS
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
    
    op.drop_column('ref_reeds', 'instrument')
    op.drop_column('ref_tip_openings', 'instrument')
