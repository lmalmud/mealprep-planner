"""rename ingredients.price_unit to serving_unit

Revision ID: 0003_rename_price_unit_to_serving_unit
Revises: 0002_create_meal_planning_tables
Create Date: 2026-08-23
"""

from alembic import op


revision = "0003_rename_price_unit_to_serving_unit"
down_revision = "0002_create_meal_planning_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.alter_column("price_unit", new_column_name="serving_unit")


def downgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.alter_column("serving_unit", new_column_name="price_unit")
