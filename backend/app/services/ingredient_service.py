from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.schemas.ingredient import IngredientRead
from app.services.food_data_central_client import FoodDataCentralClient
from app.core.config import settings

client = FoodDataCentralClient()


def list_ingredients(db: Session) -> list[IngredientRead]:
    ingredients = db.scalars(select(Ingredient).order_by(Ingredient.name)).all()
    return [ingredient.to_read() for ingredient in ingredients]


def normalize_query(query: str) -> str:
    return " ".join(query.strip().split())


def get_ingredient_by_name(db: Session, query: str) -> Ingredient | None:
    normalized = normalize_query(query).lower()
    statement = select(Ingredient).where(func.lower(Ingredient.name) == normalized)
    return db.scalars(statement).first()


def resolve_ingredient(db: Session, query: str) -> IngredientRead:
    existing = get_ingredient_by_name(db, query)
    if existing is not None:
        # If existing entry has no nutrition data, try to refresh using external API (if configured)
        if (
            existing.calories_kcal == 0
            and existing.protein_g == 0
            and existing.carbs_g == 0
            and existing.fat_g == 0
        ):
            try:
                if not settings.food_data_central_api_key:
                    # External lookup not available — return existing (may be seed or placeholder)
                    return existing.to_read()

                candidate = client.search(query)
                if candidate is None:
                    raise LookupError(f"No ingredient found for query: {query}")

                # Only update if candidate has meaningful nutrition
                if (
                    (candidate.calories_kcal or 0.0) == 0.0
                    and (candidate.protein_g or 0.0) == 0.0
                    and (candidate.carbs_g or 0.0) == 0.0
                    and (candidate.fat_g or 0.0) == 0.0
                ):
                    raise LookupError(f"No nutrient data found for query: {query}")

                existing.name = candidate.name
                existing.calories_kcal = candidate.calories_kcal
                existing.protein_g = candidate.protein_g
                existing.carbs_g = candidate.carbs_g
                existing.fat_g = candidate.fat_g
                existing.price_unit = candidate.serving_unit
                db.add(existing)
                db.commit()
                db.refresh(existing)
                return existing.to_read()
            except Exception:
                return existing.to_read()
        return existing.to_read()

    candidate = client.search(query)
    if candidate is None:
        raise LookupError(f"No ingredient found for query: {query}")

    # Ensure we have meaningful nutrition data before saving
    if (
        (candidate.calories_kcal or 0.0) == 0.0
        and (candidate.protein_g or 0.0) == 0.0
        and (candidate.carbs_g or 0.0) == 0.0
        and (candidate.fat_g or 0.0) == 0.0
    ):
        raise LookupError(f"No nutrient data found for query: {query}")

    ingredient = Ingredient(
        name=candidate.name,
        calories_kcal=candidate.calories_kcal,
        protein_g=candidate.protein_g,
        carbs_g=candidate.carbs_g,
        fat_g=candidate.fat_g,
        price_amount=0.0,
        price_currency="USD",
        price_unit=candidate.serving_unit,
    )
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient.to_read()
