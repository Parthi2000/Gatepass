"""Add to_address to packages

Revision ID: add_to_address_to_packages
Revises: 
Create Date: 2025-07-25 11:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_to_address_to_packages'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add the to_address column to the packages table
    op.add_column('packages', sa.Column('to_address', sa.String(), nullable=True))
    
    # Copy data from destination to to_address for existing records
    op.execute("""
        UPDATE packages 
        SET to_address = destination 
        WHERE to_address IS NULL
    """)

def downgrade():
    # Remove the to_address column if rolling back
    op.drop_column('packages', 'to_address')
