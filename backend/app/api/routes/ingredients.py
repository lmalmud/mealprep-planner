from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.ingredient import IngredientRead
from app.services.food_data_central_client import FoodDataCentralUnavailableError
from app.services.ingredient_service import list_ingredients, resolve_ingredient

router = APIRouter()


@router.get("/ingredients", response_model=list[IngredientRead])
def get_ingredients(db: Session = Depends(get_db)) -> list[IngredientRead]:
    return list_ingredients(db)


@router.get("/ingredients/resolve", response_model=IngredientRead)
def resolve_ingredient_endpoint(
    query: str = Query(min_length=1, description="Food or product name to resolve"),
    db: Session = Depends(get_db),
) -> IngredientRead:
    try:
        return resolve_ingredient(db, query)
    except FoodDataCentralUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
