"""Merge heads and add to_address to packages

Revision ID: merge_heads_and_add_to_address
Revises: 
Create Date: 2025-07-25 11:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads_and_add_to_address'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # This will merge all heads
    pass

def downgrade():
    # This is a merge migration, so downgrade does nothing
    pass
