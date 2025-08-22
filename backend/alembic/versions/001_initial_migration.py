"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2025-07-24 16:37:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='employee'),
        sa.Column('employee_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('employee_id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_employee_id', 'users', ['employee_id'], unique=True)

    # Create packages table
    op.create_table('packages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tracking_number', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('recipient', sa.String(), nullable=False),
        sa.Column('destination', sa.String(), nullable=False),
        sa.Column('project_code', sa.String(), nullable=False),
        sa.Column('po_number', sa.String(), nullable=True),
        sa.Column('po_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(), nullable=False, server_default='medium'),
        sa.Column('status', sa.String(), nullable=False, server_default='submitted'),
        sa.Column('gate_pass_serial_number', sa.String(), nullable=True),
        sa.Column('submitted_by', sa.Integer(), nullable=False),
        sa.Column('assigned_to_manager', sa.Integer(), nullable=True),
        sa.Column('assigned_manager_name', sa.String(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('return_status', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_manager'], ['users.id']),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tracking_number')
    )
    op.create_index('ix_packages_tracking_number', 'packages', ['tracking_number'], unique=True)
    op.create_index('ix_packages_status', 'packages', ['status'])
    op.create_index('ix_packages_submitted_by', 'packages', ['submitted_by'])
    op.create_index('ix_packages_assigned_to_manager', 'packages', ['assigned_to_manager'])

    # Create package_dimensions table
    op.create_table('package_dimensions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('length', sa.Float(), nullable=False),
        sa.Column('width', sa.Float(), nullable=False),
        sa.Column('height', sa.Float(), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_package_dimensions_package_id', 'package_dimensions', ['package_id'])

    # Create package_images table
    op.create_table('package_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('image_path', sa.String(), nullable=False),
        sa.Column('image_type', sa.String(), nullable=False, server_default='package'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_package_images_package_id', 'package_images', ['package_id'])

    # Create return_info table
    op.create_table('return_info',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('returned_by', sa.Integer(), nullable=False),
        sa.Column('return_notes', sa.Text(), nullable=True),
        sa.Column('returned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='returned'),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id']),
        sa.ForeignKeyConstraint(['returned_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_return_info_package_id', 'return_info', ['package_id'])
    op.create_index('ix_return_info_returned_by', 'return_info', ['returned_by'])


def downgrade() -> None:
    op.drop_table('return_info')
    op.drop_table('package_images')
    op.drop_table('package_dimensions')
    op.drop_table('packages')
    op.drop_table('users')
