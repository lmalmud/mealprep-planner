"""add optional price_servings_per_container column to ingredients

Revision ID: 0005_add_ingredient_price_servings_per_container
Revises: 0004_add_ingredient_price_unit
Create Date: 2026-08-23
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_add_ingredient_price_servings_per_container"
down_revision = "0004_add_ingredient_price_unit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.add_column(sa.Column("price_servings_per_container", sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.drop_column("price_servings_per_container")
