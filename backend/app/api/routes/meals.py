from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.meal import MealCreate, MealPlanCreate, MealPlanRead, MealRead, MealUpdate
from app.services.meal_service import create_meal, create_meal_plan, list_meal_plans, list_meals, update_meal

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
