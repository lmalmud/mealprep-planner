from datetime import date

from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.meal import Meal, MealIngredient, MealPlan, MealPlanAssignment
from app.schemas.meal import MealCreate, MealPlanCreate, MealPlanRead, MealRead, MealUpdate


def list_meals(db: Session) -> list[MealRead]:
    meals = db.query(Meal).order_by(Meal.name).all()
    return [meal.to_read() for meal in meals]


def create_meal(db: Session, payload: MealCreate) -> MealRead:
    meal = Meal(name=payload.name, description=payload.description)

    for item_payload in payload.ingredients:
        ingredient = db.get(Ingredient, item_payload.ingredient_id)
        if ingredient is None:
            raise LookupError(f"Ingredient {item_payload.ingredient_id} not found")
        meal.ingredients.append(
            MealIngredient(
                ingredient_id=item_payload.ingredient_id,
                quantity_amount=item_payload.quantity_amount,
                quantity_unit=item_payload.quantity_unit,
            )
        )

    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal.to_read()


def update_meal(db: Session, meal_id: int, payload: MealUpdate) -> MealRead:
    meal = db.get(Meal, meal_id)
    if meal is None:
        raise LookupError(f"No meal found with id: {meal_id}")

    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates:
        meal.name = updates["name"]
    if "description" in updates:
        meal.description = updates["description"]

    if payload.ingredients is not None:
        for item_payload in payload.ingredients:
            if db.get(Ingredient, item_payload.ingredient_id) is None:
                raise LookupError(f"Ingredient {item_payload.ingredient_id} not found")

        meal.ingredients.clear()
        for item_payload in payload.ingredients:
            meal.ingredients.append(
                MealIngredient(
                    ingredient_id=item_payload.ingredient_id,
                    quantity_amount=item_payload.quantity_amount,
                    quantity_unit=item_payload.quantity_unit,
                )
            )

    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal.to_read()


def list_meal_plans(db: Session) -> list[MealPlanRead]:
    plans = db.query(MealPlan).order_by(MealPlan.start_date).all()
    return [plan.to_read() for plan in plans]


def create_meal_plan(db: Session, payload: MealPlanCreate) -> MealPlanRead:
    try:
        parsed_date = date.fromisoformat(payload.start_date)
    except ValueError as exc:
        raise ValueError("start_date must be a valid ISO date") from exc

    plan = MealPlan(name=payload.name, start_date=parsed_date, duration_days=payload.duration_days)

    for assignment_payload in payload.assignments:
        meal = db.get(Meal, assignment_payload.meal_id)
        if meal is None:
            raise LookupError(f"Meal {assignment_payload.meal_id} not found")
        plan.assignments.append(
            MealPlanAssignment(
                day_index=assignment_payload.day_index,
                slot=assignment_payload.slot,
                meal_id=assignment_payload.meal_id,
            )
        )

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan.to_read()
