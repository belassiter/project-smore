"""enable_rls_and_policies

Revision ID: a97e38fad9dd
Revises: 1a37e8ab3382
Create Date: 2026-02-18 06:24:34.480606

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a97e38fad9dd'
down_revision: Union[str, Sequence[str], None] = '1a37e8ab3382'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Enable RLS
    op.execute('ALTER TABLE ref_mouthpieces ENABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE ref_tip_openings ENABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE ref_reeds ENABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE player_submissions ENABLE ROW LEVEL SECURITY;')

    # 2. Create Policies
    # ref_mouthpieces
    op.execute("""
        CREATE POLICY "Enable read access for all users" ON "public"."ref_mouthpieces"
        AS PERMISSIVE FOR SELECT
        TO public
        USING (true);
    """)

    # ref_tip_openings
    op.execute("""
        CREATE POLICY "Enable read access for all users" ON "public"."ref_tip_openings"
        AS PERMISSIVE FOR SELECT
        TO public
        USING (true);
    """)

    # ref_reeds
    op.execute("""
        CREATE POLICY "Enable read access for all users" ON "public"."ref_reeds"
        AS PERMISSIVE FOR SELECT
        TO public
        USING (true);
    """)

    # player_submissions (Read for stats, Insert for anon)
    op.execute("""
        CREATE POLICY "Enable read access for all users" ON "public"."player_submissions"
        AS PERMISSIVE FOR SELECT
        TO public
        USING (true);
    """)

    op.execute("""
        CREATE POLICY "Enable insert for all users" ON "public"."player_submissions"
        AS PERMISSIVE FOR INSERT
        TO public
        WITH CHECK (true);
    """)

    # 3. Fix View Security
    # Drop existing view first to ensure clean recreation
    op.execute("DROP VIEW IF EXISTS view_ref_tip_openings_full")
    
    # Recreate with security_invoker=true (Postgres 15+)
    # This ensures the view runs with permissions of the caller, respecting RLS policies.
    op.execute("""
    CREATE OR REPLACE VIEW view_ref_tip_openings_full WITH (security_invoker=true) AS
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
    # Drop view and recreate old version (standard, likely invoker by default but let's be safe)
    op.execute("DROP VIEW IF EXISTS view_ref_tip_openings_full")
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

    # Drop insert policy
    op.execute('DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."player_submissions";')
    # Drop select policies
    op.execute('DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."player_submissions";')
    op.execute('DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."ref_reeds";')
    op.execute('DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."ref_tip_openings";')
    op.execute('DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."ref_mouthpieces";')

    # Disable RLS
    op.execute('ALTER TABLE player_submissions DISABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE ref_reeds DISABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE ref_tip_openings DISABLE ROW LEVEL SECURITY;')
    op.execute('ALTER TABLE ref_mouthpieces DISABLE ROW LEVEL SECURITY;')
