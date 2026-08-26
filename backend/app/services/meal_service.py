import math
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.meal import Meal, MealIngredient, MealPlan, MealPlanAssignment
from app.schemas.meal import (
    GroceryListItem,
    MealCreate,
    MealPlanCreate,
    MealPlanRead,
    MealPlanUpdate,
    MealRead,
    MealUpdate,
)
from app.services.mass_units import grams_per_mass_unit


def list_meals(db: Session) -> list[MealRead]:
    meals = db.query(Meal).order_by(Meal.name).all()
    return [meal.to_read() for meal in meals]


def create_meal(db: Session, payload: MealCreate) -> MealRead:
    meal = Meal(name=payload.name, description=payload.description, total_servings=payload.total_servings)

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
    if "total_servings" in updates:
        meal.total_servings = updates["total_servings"]

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


def get_meal_plan_names_using_meal(db: Session, meal_id: int) -> list[str]:
    plan_ids = db.scalars(
        select(MealPlanAssignment.meal_plan_id).where(MealPlanAssignment.meal_id == meal_id).distinct()
    ).all()
    if not plan_ids:
        return []
    return list(db.scalars(select(MealPlan.name).where(MealPlan.id.in_(plan_ids))).all())


def delete_meal(db: Session, meal_id: int) -> None:
    meal = db.get(Meal, meal_id)
    if meal is None:
        raise LookupError(f"No meal found with id: {meal_id}")

    # Meal plan assignments have no relationship-based cascade from Meal, so
    # they'd be left dangling (pointing at a deleted meal) unless removed
    # explicitly first. MealIngredient rows are handled by the ORM's
    # cascade="all, delete-orphan" on Meal.ingredients.
    db.execute(delete(MealPlanAssignment).where(MealPlanAssignment.meal_id == meal_id))
    db.delete(meal)
    db.commit()


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
                servings=assignment_payload.servings,
            )
        )

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan.to_read()


def get_meal_plan(db: Session, plan_id: int) -> MealPlanRead:
    plan = db.get(MealPlan, plan_id)
    if plan is None:
        raise LookupError(f"No meal plan found with id: {plan_id}")
    return plan.to_read()


def update_meal_plan(db: Session, plan_id: int, payload: MealPlanUpdate) -> MealPlanRead:
    plan = db.get(MealPlan, plan_id)
    if plan is None:
        raise LookupError(f"No meal plan found with id: {plan_id}")

    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates:
        plan.name = updates["name"]
    if "start_date" in updates:
        try:
            plan.start_date = date.fromisoformat(updates["start_date"])
        except ValueError as exc:
            raise ValueError("start_date must be a valid ISO date") from exc
    if "duration_days" in updates:
        plan.duration_days = updates["duration_days"]

    if payload.assignments is not None:
        for assignment_payload in payload.assignments:
            if db.get(Meal, assignment_payload.meal_id) is None:
                raise LookupError(f"Meal {assignment_payload.meal_id} not found")

        plan.assignments.clear()
        for assignment_payload in payload.assignments:
            plan.assignments.append(
                MealPlanAssignment(
                    day_index=assignment_payload.day_index,
                    slot=assignment_payload.slot,
                    meal_id=assignment_payload.meal_id,
                    servings=assignment_payload.servings,
                )
            )

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan.to_read()


def delete_meal_plan(db: Session, plan_id: int) -> None:
    plan = db.get(MealPlan, plan_id)
    if plan is None:
        raise LookupError(f"No meal plan found with id: {plan_id}")
    db.delete(plan)  # cascades its MealPlanAssignment rows via the relationship
    db.commit()


def _grams_for_quantity(quantity_amount: float, quantity_unit: str, ingredient: Ingredient) -> float | None:
    # Recognized bare mass units (g/kg/oz/lb/...) always convert exactly, no
    # matter what servings the ingredient has defined.
    grams_per_unit = grams_per_mass_unit(quantity_unit)
    if grams_per_unit is not None:
        return quantity_amount * grams_per_unit

    # Otherwise, try matching the unit text against one of the ingredient's
    # own named servings (e.g. quantity_unit="1 medium apple").
    normalized = quantity_unit.strip().lower()
    matched = next(
        (s for s in ingredient.servings if s.grams is not None and s.label.strip().lower() == normalized),
        None,
    )
    return quantity_amount * matched.grams if matched else None


def generate_grocery_list(db: Session, plan_id: int) -> list[GroceryListItem]:
    plan = db.get(MealPlan, plan_id)
    if plan is None:
        raise LookupError(f"No meal plan found with id: {plan_id}")

    grams_totals: dict[int, float] = {}
    unresolved: dict[int, list[tuple[float, str]]] = {}

    for assignment in plan.assignments:
        meal = db.get(Meal, assignment.meal_id)
        if meal is None:
            continue
        servings_factor = assignment.servings / meal.total_servings
        for item in meal.ingredients:
            ingredient = db.get(Ingredient, item.ingredient_id)
            if ingredient is None:
                continue
            scaled_amount = item.quantity_amount * servings_factor
            grams = _grams_for_quantity(scaled_amount, item.quantity_unit, ingredient)
            if grams is not None:
                grams_totals[item.ingredient_id] = grams_totals.get(item.ingredient_id, 0.0) + grams
            else:
                unresolved.setdefault(item.ingredient_id, []).append((scaled_amount, item.quantity_unit))

    items: list[GroceryListItem] = []
    for ingredient_id in set(grams_totals) | set(unresolved):
        ingredient = db.get(Ingredient, ingredient_id)
        if ingredient is None:
            continue

        notes: list[str] = []
        for amount, unit in unresolved.get(ingredient_id, []):
            notes.append(
                f"Couldn't convert {amount:g} x {unit!r} for {ingredient.name} — not a recognized mass unit "
                "or one of its named servings."
            )

        total_grams = grams_totals.get(ingredient_id)
        if total_grams is None:
            items.append(
                GroceryListItem(
                    ingredient_id=ingredient_id,
                    ingredient_name=ingredient.name,
                    total_amount=0.0,
                    total_unit="g",
                    note=" ".join(notes),
                )
            )
            continue

        containers_needed: float | None = None
        estimated_cost: float | None = None
        price_serving = ingredient.price_serving()
        if price_serving is not None and price_serving.grams:
            containers_needed = math.ceil(total_grams / price_serving.grams)
            estimated_cost = containers_needed * ingredient.price_amount
        else:
            notes.append(f"No known package size for {ingredient.name} — can't estimate purchase count.")

        items.append(
            GroceryListItem(
                ingredient_id=ingredient_id,
                ingredient_name=ingredient.name,
                total_amount=round(total_grams, 1),
                total_unit="g",
                containers_needed=containers_needed,
                estimated_cost=estimated_cost,
                currency=ingredient.price_currency if estimated_cost is not None else None,
                note=" ".join(notes) or None,
            )
        )

    items.sort(key=lambda item: item.ingredient_name)
    return items
