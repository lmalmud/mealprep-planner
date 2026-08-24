from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient, IngredientServing
from app.models.meal import Meal, MealIngredient, MealPlanAssignment
from app.schemas.ingredient import (
    IngredientCreate,
    IngredientMacros,
    IngredientPrice,
    IngredientRead,
    IngredientResolveResult,
    IngredientServingInput,
    IngredientUpdate,
)
from app.services.food_data_central_client import (
    FoodDataCentralClient,
    FoodDataCentralUnavailableError,
    FoodDataIngredientCandidate,
)
from app.services.mass_units import parse_mass_grams
from app.services.product_url_client import ProductUrlClient
from app.core.config import settings

client = FoodDataCentralClient()
url_client = ProductUrlClient()


class IngredientNameConflictError(Exception):
    pass


def _serving_input(label: str, *, is_default: bool = False, is_price_serving: bool = False) -> IngredientServingInput:
    # Auto-fills `grams` whenever the label itself is a parseable mass
    # quantity (e.g. "154g", "2lb") — the single place this happens so no
    # caller can forget it, whether building a preview or persisting servings.
    return IngredientServingInput(
        label=label,
        grams=parse_mass_grams(label),
        is_default=is_default,
        is_price_serving=is_price_serving,
    )


def _servings_for_fdc_candidate(candidate: FoodDataIngredientCandidate) -> list[IngredientServingInput]:
    # `candidate.serving_unit` is always "100g" — the one serving guaranteed
    # to match FDC's per-100g macro values. Its own package/household
    # serving (e.g. "1 large egg"), when known, is added as a convenience
    # unit alongside it, not as the macro basis.
    servings = [_serving_input(candidate.serving_unit, is_default=True, is_price_serving=True)]
    if candidate.extra_serving_label and candidate.extra_serving_grams:
        servings.append(
            IngredientServingInput(
                label=candidate.extra_serving_label,
                grams=candidate.extra_serving_grams,
                is_default=False,
                is_price_serving=False,
            )
        )
    return servings


def _build_servings(inputs: list[IngredientServingInput]) -> list[IngredientServing]:
    filled = [
        s if s.grams is not None else s.model_copy(update={"grams": parse_mass_grams(s.label)}) for s in inputs
    ]
    if not any(s.is_default for s in filled):
        filled = [s.model_copy(update={"is_default": i == 0}) for i, s in enumerate(filled)]
    return [
        IngredientServing(
            label=s.label, grams=s.grams, is_default=s.is_default, is_price_serving=s.is_price_serving
        )
        for s in filled
    ]


def list_ingredients(db: Session) -> list[IngredientRead]:
    ingredients = db.scalars(select(Ingredient).order_by(Ingredient.name)).all()
    return [ingredient.to_read() for ingredient in ingredients]


def normalize_query(query: str) -> str:
    return " ".join(query.strip().split())


def get_ingredient_by_name(db: Session, query: str) -> Ingredient | None:
    normalized = normalize_query(query).lower()
    statement = select(Ingredient).where(func.lower(Ingredient.name) == normalized)
    return db.scalars(statement).first()


def search_ingredient(db: Session, query: str) -> IngredientResolveResult:
    existing = get_ingredient_by_name(db, query)
    if existing is not None:
        # If existing entry has no nutrition data, try to refresh using external API (if configured)
        if (
            existing.calories_kcal == 0
            and existing.protein_g == 0
            and existing.carbs_g == 0
            and existing.fat_g == 0
        ):
            try:
                if not settings.food_data_central_api_key:
                    # External lookup not available — return existing (may be seed or placeholder)
                    return IngredientResolveResult(status="existing", ingredient=existing.to_read())

                candidate = client.search(query)
                if candidate is None:
                    raise LookupError(f"No ingredient found for query: {query}")

                # Only update if candidate has meaningful nutrition
                if (
                    (candidate.calories_kcal or 0.0) == 0.0
                    and (candidate.protein_g or 0.0) == 0.0
                    and (candidate.carbs_g or 0.0) == 0.0
                    and (candidate.fat_g or 0.0) == 0.0
                ):
                    raise LookupError(f"No nutrient data found for query: {query}")

                existing.name = candidate.name
                existing.calories_kcal = candidate.calories_kcal
                existing.protein_g = candidate.protein_g
                existing.carbs_g = candidate.carbs_g
                existing.fat_g = candidate.fat_g
                existing.fiber_g = candidate.fiber_g
                existing.sugar_g = candidate.sugar_g
                default = existing.default_serving()
                if default is not None:
                    default.label = candidate.serving_unit
                    default.grams = parse_mass_grams(candidate.serving_unit)
                db.add(existing)
                db.commit()
                db.refresh(existing)
                return IngredientResolveResult(status="existing", ingredient=existing.to_read())
            except Exception:
                return IngredientResolveResult(status="existing", ingredient=existing.to_read())
        return IngredientResolveResult(status="existing", ingredient=existing.to_read())

    candidate = client.search(query)
    if candidate is None:
        raise LookupError(f"No ingredient found for query: {query}")

    # Ensure we have meaningful nutrition data before returning a preview
    if (
        (candidate.calories_kcal or 0.0) == 0.0
        and (candidate.protein_g or 0.0) == 0.0
        and (candidate.carbs_g or 0.0) == 0.0
        and (candidate.fat_g or 0.0) == 0.0
    ):
        raise LookupError(f"No nutrient data found for query: {query}")

    preview = IngredientCreate(
        name=candidate.name,
        servings=_servings_for_fdc_candidate(candidate),
        macros=IngredientMacros(
            calories_kcal=candidate.calories_kcal,
            protein_g=candidate.protein_g,
            carbs_g=candidate.carbs_g,
            fat_g=candidate.fat_g,
            fiber_g=candidate.fiber_g,
            sugar_g=candidate.sugar_g,
        ),
        price=IngredientPrice(amount=0.0, currency="USD"),
    )
    return IngredientResolveResult(status="preview", candidate=preview)


def search_ingredient_by_url(db: Session, url: str) -> IngredientResolveResult:
    product = url_client.fetch_product(url)

    existing = get_ingredient_by_name(db, product.name)
    if existing is not None:
        return IngredientResolveResult(status="existing", ingredient=existing.to_read())

    calories, protein, carbs, fat = (
        product.calories_kcal,
        product.protein_g,
        product.carbs_g,
        product.fat_g,
    )
    fiber = 0.0
    sugar = 0.0
    servings = [_serving_input(product.serving_unit or "100g", is_default=True, is_price_serving=True)]

    # Only fall back to a name-based FDC search if the page itself didn't
    # already provide any nutrition facts (e.g. Target embeds a real facts
    # panel; most retailers don't, and macros must come from FDC by name).
    if calories is None and protein is None and carbs is None and fat is None:
        try:
            fdc_candidate = client.search(product.name)
            if fdc_candidate is not None:
                calories = fdc_candidate.calories_kcal
                protein = fdc_candidate.protein_g
                carbs = fdc_candidate.carbs_g
                fat = fdc_candidate.fat_g
                fiber = fdc_candidate.fiber_g
                sugar = fdc_candidate.sugar_g
                servings = _servings_for_fdc_candidate(fdc_candidate)
        except FoodDataCentralUnavailableError:
            # A URL-sourced candidate (name/price) is still useful even if macro
            # lookup fails — the confirm dialog lets the user fill macros in by hand.
            pass

    currency = (product.price_currency or "").strip().upper()
    if len(currency) != 3 or not currency.isalpha():
        currency = "USD"

    preview = IngredientCreate(
        name=product.name,
        servings=servings,
        macros=IngredientMacros(
            calories_kcal=calories or 0.0,
            protein_g=protein or 0.0,
            carbs_g=carbs or 0.0,
            fat_g=fat or 0.0,
            fiber_g=fiber,
            sugar_g=sugar,
        ),
        price=IngredientPrice(amount=product.price_amount or 0.0, currency=currency),
        source_url=url,
    )
    return IngredientResolveResult(status="preview", candidate=preview)


def create_ingredient(db: Session, payload: IngredientCreate) -> IngredientRead:
    if get_ingredient_by_name(db, payload.name) is not None:
        raise IngredientNameConflictError(f"An ingredient named '{payload.name}' already exists.")

    ingredient = Ingredient(
        name=payload.name,
        calories_kcal=payload.macros.calories_kcal,
        protein_g=payload.macros.protein_g,
        carbs_g=payload.macros.carbs_g,
        fat_g=payload.macros.fat_g,
        fiber_g=payload.macros.fiber_g,
        sugar_g=payload.macros.sugar_g,
        price_amount=payload.price.amount,
        price_currency=payload.price.currency,
        source_url=payload.source_url,
    )
    ingredient.servings = _build_servings(payload.servings)

    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient.to_read()


def update_ingredient(db: Session, ingredient_id: int, payload: IngredientUpdate) -> IngredientRead:
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise LookupError(f"No ingredient found with id: {ingredient_id}")

    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates:
        conflict = get_ingredient_by_name(db, updates["name"])
        if conflict is not None and conflict.id != ingredient_id:
            raise IngredientNameConflictError(f"An ingredient named '{updates['name']}' already exists.")
        ingredient.name = updates["name"]

    if "calories_kcal" in updates:
        ingredient.calories_kcal = updates["calories_kcal"]
    if "protein_g" in updates:
        ingredient.protein_g = updates["protein_g"]
    if "carbs_g" in updates:
        ingredient.carbs_g = updates["carbs_g"]
    if "fat_g" in updates:
        ingredient.fat_g = updates["fat_g"]
    if "fiber_g" in updates:
        ingredient.fiber_g = updates["fiber_g"]
    if "sugar_g" in updates:
        ingredient.sugar_g = updates["sugar_g"]
    if "price_amount" in updates:
        ingredient.price_amount = updates["price_amount"]
    if "price_currency" in updates:
        ingredient.price_currency = updates["price_currency"]
    if "source_url" in updates:
        ingredient.source_url = updates["source_url"]

    if payload.servings is not None:
        ingredient.servings.clear()
        ingredient.servings = _build_servings(payload.servings)

    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient.to_read()


def get_meal_names_using_ingredient(db: Session, ingredient_id: int) -> list[str]:
    meal_ids = db.scalars(
        select(MealIngredient.meal_id).where(MealIngredient.ingredient_id == ingredient_id).distinct()
    ).all()
    if not meal_ids:
        return []
    return list(db.scalars(select(Meal.name).where(Meal.id.in_(meal_ids))).all())


def delete_ingredient(db: Session, ingredient_id: int) -> None:
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise LookupError(f"No ingredient found with id: {ingredient_id}")

    meal_ids = db.scalars(
        select(MealIngredient.meal_id).where(MealIngredient.ingredient_id == ingredient_id).distinct()
    ).all()

    if meal_ids:
        # Meal plan assignments have no relationship-based cascade from Meal,
        # so they'd be left dangling (pointing at a deleted meal) unless
        # removed explicitly before the meals themselves are deleted.
        db.execute(delete(MealPlanAssignment).where(MealPlanAssignment.meal_id.in_(meal_ids)))
        for meal in db.scalars(select(Meal).where(Meal.id.in_(meal_ids))):
            db.delete(meal)  # cascades its MealIngredient rows via the relationship

    db.delete(ingredient)
    db.commit()
