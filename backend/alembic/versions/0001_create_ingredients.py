"""create ingredients table and seed starter rows

Revision ID: 0001_create_ingredients
Revises:
Create Date: 2026-07-12
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_create_ingredients"
down_revision = None
branch_labels = None
depends_on = None



def upgrade() -> None:
    op.create_table(
        "ingredients",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("name", sa.String(length=200), nullable=False, unique=True),
        sa.Column("calories_kcal", sa.Float(), nullable=False),
        sa.Column("protein_g", sa.Float(), nullable=False),
        sa.Column("carbs_g", sa.Float(), nullable=False),
        sa.Column("fat_g", sa.Float(), nullable=False),
        sa.Column("price_amount", sa.Float(), nullable=False),
        sa.Column("price_currency", sa.String(length=3), nullable=False),
        sa.Column("price_unit", sa.String(length=50), nullable=False),
    )

    op.bulk_insert(
        sa.table(
            "ingredients",
            sa.column("name", sa.String()),
            sa.column("calories_kcal", sa.Float()),
            sa.column("protein_g", sa.Float()),
            sa.column("carbs_g", sa.Float()),
            sa.column("fat_g", sa.Float()),
            sa.column("price_amount", sa.Float()),
            sa.column("price_currency", sa.String()),
            sa.column("price_unit", sa.String()),
        ),
        [
            {
                "name": "Chicken Breast",
                "calories_kcal": 165,
                "protein_g": 31,
                "carbs_g": 0,
                "fat_g": 3.6,
                "price_amount": 1.99,
                "price_currency": "USD",
                "price_unit": "100g",
            },
            {
                "name": "Brown Rice",
                "calories_kcal": 111,
                "protein_g": 2.6,
                "carbs_g": 23,
                "fat_g": 0.9,
                "price_amount": 0.35,
                "price_currency": "USD",
                "price_unit": "100g",
            },
            {
                "name": "Broccoli",
                "calories_kcal": 35,
                "protein_g": 2.4,
                "carbs_g": 7.2,
                "fat_g": 0.4,
                "price_amount": 0.79,
                "price_currency": "USD",
                "price_unit": "100g",
            },
        ],
    )



def downgrade() -> None:
    op.drop_table("ingredients")
