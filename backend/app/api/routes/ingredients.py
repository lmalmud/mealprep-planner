from fastapi import APIRouter

from app.schemas.ingredient import IngredientRead
from app.services.ingredient_service import list_ingredients

router = APIRouter()


@router.get("/ingredients", response_model=list[IngredientRead])
def get_ingredients() -> list[IngredientRead]:
    return list_ingredients()
