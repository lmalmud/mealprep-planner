from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.schemas.ingredient import IngredientRead
from app.services.food_data_central_client import FoodDataCentralClient

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
        return existing.to_read()

    candidate = client.search(query)
    if candidate is None:
        raise LookupError(f"No ingredient found for query: {query}")

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
