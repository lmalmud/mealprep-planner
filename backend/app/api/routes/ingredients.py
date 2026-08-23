from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.ingredient import (
    IngredientCreate,
    IngredientRead,
    IngredientResolveResult,
    IngredientUpdate,
)
from app.services.food_data_central_client import FoodDataCentralUnavailableError
from app.services.ingredient_service import (
    IngredientNameConflictError,
    create_ingredient,
    delete_ingredient,
    get_meal_names_using_ingredient,
    list_ingredients,
    search_ingredient,
    search_ingredient_by_url,
    update_ingredient,
)
from app.services.product_url_client import ProductUrlParseError, ProductUrlUnavailableError

router = APIRouter()


@router.get("/ingredients", response_model=list[IngredientRead])
def get_ingredients(db: Session = Depends(get_db)) -> list[IngredientRead]:
    return list_ingredients(db)


@router.get("/ingredients/resolve", response_model=IngredientResolveResult)
def resolve_ingredient_endpoint(
    query: str = Query(min_length=1, description="Food or product name to resolve"),
    db: Session = Depends(get_db),
) -> IngredientResolveResult:
    try:
        return search_ingredient(db, query)
    except FoodDataCentralUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/ingredients/resolve-url", response_model=IngredientResolveResult)
def resolve_ingredient_url_endpoint(
    url: str = Query(min_length=1, description="Product page URL to extract name/price from"),
    db: Session = Depends(get_db),
) -> IngredientResolveResult:
    try:
        return search_ingredient_by_url(db, url)
    except ProductUrlParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ProductUrlUnavailableError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/ingredients", response_model=IngredientRead, status_code=201)
def create_ingredient_endpoint(
    payload: IngredientCreate, db: Session = Depends(get_db)
) -> IngredientRead:
    try:
        return create_ingredient(db, payload)
    except IngredientNameConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/ingredients/{ingredient_id}", response_model=IngredientRead)
def update_ingredient_endpoint(
    ingredient_id: int, payload: IngredientUpdate, db: Session = Depends(get_db)
) -> IngredientRead:
    try:
        return update_ingredient(db, ingredient_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except IngredientNameConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/ingredients/{ingredient_id}/usage", response_model=list[str])
def get_ingredient_usage_endpoint(ingredient_id: int, db: Session = Depends(get_db)) -> list[str]:
    return get_meal_names_using_ingredient(db, ingredient_id)


@router.delete("/ingredients/{ingredient_id}", status_code=204)
def delete_ingredient_endpoint(ingredient_id: int, db: Session = Depends(get_db)) -> None:
    try:
        delete_ingredient(db, ingredient_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
