from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.ingredient import IngredientRead
from app.services.ingredient_service import list_ingredients

router = APIRouter()


@router.get("/ingredients", response_model=list[IngredientRead])
def get_ingredients(db: Session = Depends(get_db)) -> list[IngredientRead]:
    return list_ingredients(db)
