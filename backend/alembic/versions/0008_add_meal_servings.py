"""add total_servings to meals and servings to meal_plan_assignments

Revision ID: 0008_add_meal_servings
Revises: 0007_add_fiber_sugar_source_url
Create Date: 2026-08-26
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_add_meal_servings"
down_revision = "0007_add_fiber_sugar_source_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("meals") as batch_op:
        batch_op.add_column(
            sa.Column("total_servings", sa.Float(), nullable=False, server_default="1")
        )
    with op.batch_alter_table("meal_plan_assignments") as batch_op:
        batch_op.add_column(
            sa.Column("servings", sa.Float(), nullable=False, server_default="1")
        )


def downgrade() -> None:
    with op.batch_alter_table("meal_plan_assignments") as batch_op:
        batch_op.drop_column("servings")
    with op.batch_alter_table("meals") as batch_op:
        batch_op.drop_column("total_servings")
