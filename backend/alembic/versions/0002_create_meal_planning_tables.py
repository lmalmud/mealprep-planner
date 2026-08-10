"""create meal planning tables

Revision ID: 0002_create_meal_planning_tables
Revises: 0001_create_ingredients
Create Date: 2026-08-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_create_meal_planning_tables"
down_revision = "0001_create_ingredients"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "meals",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
    )

    op.create_table(
        "meal_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("meal_id", sa.Integer(), sa.ForeignKey("meals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.id"), nullable=False),
        sa.Column("quantity_amount", sa.Float(), nullable=False),
        sa.Column("quantity_unit", sa.String(length=50), nullable=False),
    )

    op.create_table(
        "meal_plans",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
    )

    op.create_table(
        "meal_plan_assignments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("meal_plan_id", sa.Integer(), sa.ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day_index", sa.Integer(), nullable=False),
        sa.Column("slot", sa.String(length=50), nullable=False),
        sa.Column("meal_id", sa.Integer(), sa.ForeignKey("meals.id"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("meal_plan_assignments")
    op.drop_table("meal_plans")
    op.drop_table("meal_ingredients")
    op.drop_table("meals")
