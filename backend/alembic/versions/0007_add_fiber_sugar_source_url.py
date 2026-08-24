"""add fiber_g, sugar_g, and source_url to ingredients

Revision ID: 0007_add_fiber_sugar_source_url
Revises: 0006_add_ingredient_servings
Create Date: 2026-08-25
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_add_fiber_sugar_source_url"
down_revision = "0006_add_ingredient_servings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.add_column(
            sa.Column("fiber_g", sa.Float(), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column("sugar_g", sa.Float(), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("source_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.drop_column("fiber_g")
        batch_op.drop_column("sugar_g")
        batch_op.drop_column("source_url")
