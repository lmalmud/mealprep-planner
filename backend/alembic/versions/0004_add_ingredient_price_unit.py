"""add optional price_unit column to ingredients

Revision ID: 0004_add_ingredient_price_unit
Revises: 0003_rename_price_unit_to_serving_unit
Create Date: 2026-08-23
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_add_ingredient_price_unit"
down_revision = "0003_rename_price_unit_to_serving_unit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.add_column(sa.Column("price_unit", sa.String(length=50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.drop_column("price_unit")
