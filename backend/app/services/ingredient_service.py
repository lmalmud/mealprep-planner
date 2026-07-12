from app.schemas.ingredient import IngredientMacros, IngredientPrice, IngredientRead


def list_ingredients() -> list[IngredientRead]:
    # Seed data for API integration. Replace with database queries in the next milestone.
    return [
        IngredientRead(
            id=1,
            name="Chicken Breast",
            macros=IngredientMacros(calories_kcal=165, protein_g=31, carbs_g=0, fat_g=3.6),
            price=IngredientPrice(amount=1.99, currency="USD", unit="100g"),
        ),
        IngredientRead(
            id=2,
            name="Brown Rice",
            macros=IngredientMacros(calories_kcal=111, protein_g=2.6, carbs_g=23, fat_g=0.9),
            price=IngredientPrice(amount=0.35, currency="USD", unit="100g"),
        ),
        IngredientRead(
            id=3,
            name="Broccoli",
            macros=IngredientMacros(calories_kcal=35, protein_g=2.4, carbs_g=7.2, fat_g=0.4),
            price=IngredientPrice(amount=0.79, currency="USD", unit="100g"),
        ),
    ]
