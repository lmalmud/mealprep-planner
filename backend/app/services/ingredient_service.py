from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.schemas.ingredient import IngredientRead

def list_ingredients(db: Session) -> list[IngredientRead]:
    ingredients = db.scalars(select(Ingredient).order_by(Ingredient.name)).all()
    return [ingredient.to_read() for ingredient in ingredients]
