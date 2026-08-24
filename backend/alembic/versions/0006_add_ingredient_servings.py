"""add ingredient_servings table; migrate serving_unit/price_unit/price_servings_per_container into it

Revision ID: 0006_add_ingredient_servings
Revises: 0005_add_ingredient_price_servings_per_container
Create Date: 2026-08-24
"""

import re

from alembic import op
import sqlalchemy as sa


revision = "0006_add_ingredient_servings"
down_revision = "0005_add_ingredient_price_servings_per_container"
branch_labels = None
depends_on = None

_GRAMS_PER_UNIT = {
    "g": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "kg": 1000.0,
    "kilogram": 1000.0,
    "kilograms": 1000.0,
    "mg": 0.001,
    "milligram": 0.001,
    "milligrams": 0.001,
    "oz": 28.3495,
    "ounce": 28.3495,
    "ounces": 28.3495,
    "lb": 453.592,
    "lbs": 453.592,
    "pound": 453.592,
    "pounds": 453.592,
}


def _parse_mass_grams(text: str) -> float | None:
    match = re.match(r"^([\d.]+)\s*(.*)$", text.strip())
    if not match:
        return None
    try:
        amount = float(match.group(1))
    except ValueError:
        return None
    grams_per_unit = _GRAMS_PER_UNIT.get(match.group(2).strip().lower())
    return amount * grams_per_unit if grams_per_unit is not None else None


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "ingredient_servings",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "ingredient_id",
            sa.Integer(),
            sa.ForeignKey("ingredients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("grams", sa.Float(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_price_serving", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    ingredients_table = sa.table(
        "ingredients",
        sa.column("id", sa.Integer()),
        sa.column("serving_unit", sa.String()),
        sa.column("price_unit", sa.String()),
        sa.column("price_servings_per_container", sa.Float()),
    )
    servings_table = sa.table(
        "ingredient_servings",
        sa.column("ingredient_id", sa.Integer()),
        sa.column("label", sa.String()),
        sa.column("grams", sa.Float()),
        sa.column("is_default", sa.Boolean()),
        sa.column("is_price_serving", sa.Boolean()),
    )

    rows = bind.execute(
        sa.select(
            ingredients_table.c.id,
            ingredients_table.c.serving_unit,
            ingredients_table.c.price_unit,
            ingredients_table.c.price_servings_per_container,
        )
    ).fetchall()

    for ingredient_id, serving_unit, price_unit, servings_per_container in rows:
        default_grams = _parse_mass_grams(serving_unit)

        # Preserve the exact previously-computed price-per-serving where possible:
        # the old system's `servings_per_container` meant "N servings of
        # serving_unit are in the priced container", not a literal parse of
        # price_unit's text — so re-derive the container's grams from that,
        # not from parsing e.g. "2lb pack" literally (packaging weights are
        # rounded/approximate anyway, and this keeps the displayed numbers
        # from silently shifting during migration).
        price_label = None
        price_grams = None
        if servings_per_container and default_grams is not None:
            price_grams = servings_per_container * default_grams
            formatted_count = f"{servings_per_container:g}"
            price_label = f"{formatted_count} × {serving_unit}"
        elif price_unit:
            price_grams = _parse_mass_grams(price_unit)
            price_label = price_unit

        needs_separate_price_serving = price_label is not None and (
            price_label != serving_unit or price_grams != default_grams
        )

        bind.execute(
            servings_table.insert().values(
                ingredient_id=ingredient_id,
                label=serving_unit,
                grams=default_grams,
                is_default=True,
                is_price_serving=not needs_separate_price_serving,
            )
        )
        if needs_separate_price_serving:
            bind.execute(
                servings_table.insert().values(
                    ingredient_id=ingredient_id,
                    label=price_label,
                    grams=price_grams,
                    is_default=False,
                    is_price_serving=True,
                )
            )

    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.drop_column("serving_unit")
        batch_op.drop_column("price_unit")
        batch_op.drop_column("price_servings_per_container")


def downgrade() -> None:
    with op.batch_alter_table("ingredients") as batch_op:
        batch_op.add_column(
            sa.Column("serving_unit", sa.String(length=50), nullable=False, server_default="100g")
        )
        batch_op.add_column(sa.Column("price_unit", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("price_servings_per_container", sa.Float(), nullable=True))
    op.drop_table("ingredient_servings")
