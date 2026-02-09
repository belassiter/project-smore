"""split_modification_flags

Revision ID: 1a37e8ab3382
Revises: 49bbb0badddf
Create Date: 2026-02-08 20:23:38.976082

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a37e8ab3382'
down_revision: Union[str, Sequence[str], None] = '49bbb0badddf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('player_submissions', sa.Column('is_mouthpiece_modified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('player_submissions', sa.Column('is_reed_modified', sa.Boolean(), server_default='false', nullable=False))
    
    # Optional: Copy data from old 'modifications' column to 'is_mouthpiece_modified' if you wanted to preserve vague history,
    # but since we're in dev/seed mode, we'll just drop the old column.
    op.drop_column('player_submissions', 'modifications')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('player_submissions', sa.Column('modifications', sa.Boolean(), server_default='false', nullable=False))
    op.drop_column('player_submissions', 'is_reed_modified')
    op.drop_column('player_submissions', 'is_mouthpiece_modified')
