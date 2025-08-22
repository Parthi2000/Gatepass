"""remove tracking_number unique constraint

Revision ID: remove_tracking_number_unique
Revises: make_tracking_number_nullable
Create Date: 2025-07-25 15:08:10.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_tracking_number_unique'
down_revision = 'make_tracking_number_nullable'
branch_labels = None
depends_on = None

def upgrade():
    # Remove unique constraint from tracking_number if it exists
    with op.batch_alter_table('packages') as batch_op:
        # Drop the unique constraint if it exists (trying different possible constraint names)
        batch_op.drop_constraint('uq_packages_tracking_number', type_='unique')
        batch_op.drop_constraint('ix_packages_tracking_number', type_='unique')
        batch_op.drop_constraint('packages_tracking_number_key', type_='unique')
        
        # Also drop and recreate the index without unique constraint
        batch_op.drop_index('ix_packages_tracking_number')
        batch_op.create_index('ix_packages_tracking_number', ['tracking_number'], unique=False)

def downgrade():
    # Re-add unique constraint to tracking_number
    with op.batch_alter_table('packages') as batch_op:
        batch_op.create_unique_constraint('uq_packages_tracking_number', ['tracking_number'])
