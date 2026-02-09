"""add_data_source_column

Revision ID: 019870c9e5ab
Revises: 7cb9dec5e088
Create Date: 2026-02-08 13:48:25.904292

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '019870c9e5ab'
down_revision: Union[str, Sequence[str], None] = '7cb9dec5e088'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ref_mouthpieces', sa.Column('data_source', sa.String(), nullable=True))
    op.add_column('ref_tip_openings', sa.Column('data_source', sa.String(), nullable=True))
    op.add_column('ref_reeds', sa.Column('data_source', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ref_reeds', 'data_source')
    op.drop_column('ref_tip_openings', 'data_source')
    op.drop_column('ref_mouthpieces', 'data_source')
