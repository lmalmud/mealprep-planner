from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.meal import (
    GroceryListItem,
    MealCreate,
    MealPlanCreate,
    MealPlanRead,
    MealPlanUpdate,
    MealRead,
    MealUpdate,
)
from app.services.meal_service import (
    create_meal,
    create_meal_plan,
    delete_meal,
    delete_meal_plan,
    generate_grocery_list,
    get_meal_plan,
    get_meal_plan_names_using_meal,
    list_meal_plans,
    list_meals,
    update_meal,
    update_meal_plan,
)

router = APIRouter()


@router.get("/meals", response_model=list[MealRead])
def get_meals(db: Session = Depends(get_db)) -> list[MealRead]:
    return list_meals(db)


@router.post("/meals", response_model=MealRead, status_code=201)
def create_meal_endpoint(payload: MealCreate, db: Session = Depends(get_db)) -> MealRead:
    try:
        return create_meal(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/meals/{meal_id}", response_model=MealRead)
def update_meal_endpoint(meal_id: int, payload: MealUpdate, db: Session = Depends(get_db)) -> MealRead:
    try:
        return update_meal(db, meal_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/meals/{meal_id}/usage", response_model=list[str])
def get_meal_usage_endpoint(meal_id: int, db: Session = Depends(get_db)) -> list[str]:
    return get_meal_plan_names_using_meal(db, meal_id)


@router.delete("/meals/{meal_id}", status_code=204)
def delete_meal_endpoint(meal_id: int, db: Session = Depends(get_db)) -> None:
    try:
        delete_meal(db, meal_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/meal-plans", response_model=list[MealPlanRead])
def get_meal_plans(db: Session = Depends(get_db)) -> list[MealPlanRead]:
    return list_meal_plans(db)


@router.post("/meal-plans", response_model=MealPlanRead, status_code=201)
def create_meal_plan_endpoint(payload: MealPlanCreate, db: Session = Depends(get_db)) -> MealPlanRead:
    try:
        return create_meal_plan(db, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/meal-plans/{plan_id}", response_model=MealPlanRead)
def get_meal_plan_endpoint(plan_id: int, db: Session = Depends(get_db)) -> MealPlanRead:
    try:
        return get_meal_plan(db, plan_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/meal-plans/{plan_id}", response_model=MealPlanRead)
def update_meal_plan_endpoint(
    plan_id: int, payload: MealPlanUpdate, db: Session = Depends(get_db)
) -> MealPlanRead:
    try:
        return update_meal_plan(db, plan_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/meal-plans/{plan_id}", status_code=204)
def delete_meal_plan_endpoint(plan_id: int, db: Session = Depends(get_db)) -> None:
    try:
        delete_meal_plan(db, plan_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/meal-plans/{plan_id}/grocery-list", response_model=list[GroceryListItem])
def get_grocery_list_endpoint(plan_id: int, db: Session = Depends(get_db)) -> list[GroceryListItem]:
    try:
        return generate_grocery_list(db, plan_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
