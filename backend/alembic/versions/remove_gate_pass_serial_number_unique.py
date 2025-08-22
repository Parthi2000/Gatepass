"""remove gate_pass_serial_number unique constraint

Revision ID: remove_gate_pass_serial_number_unique
Revises: make_tracking_number_nullable
Create Date: 2025-07-25 15:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_gate_pass_serial_number_unique'
down_revision = 'make_tracking_number_nullable'
branch_labels = None
depends_on = None

def upgrade():
    # Remove unique constraint from gate_pass_serial_number if it exists
    with op.batch_alter_table('packages') as batch_op:
        batch_op.drop_constraint('uq_packages_gate_pass_serial_number', type_='unique')

def downgrade():
    # Re-add unique constraint to gate_pass_serial_number
    with op.batch_alter_table('packages') as batch_op:
        batch_op.create_unique_constraint('uq_packages_gate_pass_serial_number', ['gate_pass_serial_number'])
