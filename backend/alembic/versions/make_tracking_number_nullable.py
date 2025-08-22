"""make tracking_number nullable

Revision ID: make_tracking_number_nullable
Revises: 
Create Date: 2025-07-25 12:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'make_tracking_number_nullable'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Make tracking_number nullable
    op.alter_column('packages', 'tracking_number',
                   existing_type=sa.String(),
                   nullable=True,
                   existing_index=True,
                   existing_unique=True)

def downgrade():
    # Revert the change - make tracking_number NOT NULL again
    op.alter_column('packages', 'tracking_number',
                   existing_type=sa.String(),
                   nullable=False,
                   existing_index=True,
                   existing_unique=True)
