from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.meal import MealIngredient
from app.schemas.ingredient import (
    IngredientCreate,
    IngredientMacros,
    IngredientPrice,
    IngredientRead,
    IngredientResolveResult,
    IngredientUpdate,
)
from app.services.food_data_central_client import FoodDataCentralClient, FoodDataCentralUnavailableError
from app.services.product_url_client import ProductUrlClient
from app.core.config import settings

client = FoodDataCentralClient()
url_client = ProductUrlClient()


class IngredientNameConflictError(Exception):
    pass


class IngredientInUseError(Exception):
    pass


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
                existing.serving_unit = candidate.serving_unit
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
        serving_unit=candidate.serving_unit,
        macros=IngredientMacros(
            calories_kcal=candidate.calories_kcal,
            protein_g=candidate.protein_g,
            carbs_g=candidate.carbs_g,
            fat_g=candidate.fat_g,
        ),
        price=IngredientPrice(amount=0.0, currency="USD"),
    )
    return IngredientResolveResult(status="preview", candidate=preview)


def search_ingredient_by_url(db: Session, url: str) -> IngredientResolveResult:
    product = url_client.fetch_product(url)

    existing = get_ingredient_by_name(db, product.name)
    if existing is not None:
        return IngredientResolveResult(status="existing", ingredient=existing.to_read())

    calories = protein = carbs = fat = 0.0
    serving_unit = "100g"
    try:
        fdc_candidate = client.search(product.name)
        if fdc_candidate is not None:
            calories = fdc_candidate.calories_kcal
            protein = fdc_candidate.protein_g
            carbs = fdc_candidate.carbs_g
            fat = fdc_candidate.fat_g
            serving_unit = fdc_candidate.serving_unit
    except FoodDataCentralUnavailableError:
        # A URL-sourced candidate (name/price) is still useful even if macro
        # lookup fails — the confirm dialog lets the user fill macros in by hand.
        pass

    currency = (product.price_currency or "").strip().upper()
    if len(currency) != 3 or not currency.isalpha():
        currency = "USD"

    preview = IngredientCreate(
        name=product.name,
        serving_unit=serving_unit,
        macros=IngredientMacros(calories_kcal=calories, protein_g=protein, carbs_g=carbs, fat_g=fat),
        price=IngredientPrice(amount=product.price_amount or 0.0, currency=currency),
    )
    return IngredientResolveResult(status="preview", candidate=preview)


def create_ingredient(db: Session, payload: IngredientCreate) -> IngredientRead:
    if get_ingredient_by_name(db, payload.name) is not None:
        raise IngredientNameConflictError(f"An ingredient named '{payload.name}' already exists.")

    ingredient = Ingredient(
        name=payload.name,
        serving_unit=payload.serving_unit,
        calories_kcal=payload.macros.calories_kcal,
        protein_g=payload.macros.protein_g,
        carbs_g=payload.macros.carbs_g,
        fat_g=payload.macros.fat_g,
        price_amount=payload.price.amount,
        price_currency=payload.price.currency,
    )
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

    if "serving_unit" in updates:
        ingredient.serving_unit = updates["serving_unit"]
    if "calories_kcal" in updates:
        ingredient.calories_kcal = updates["calories_kcal"]
    if "protein_g" in updates:
        ingredient.protein_g = updates["protein_g"]
    if "carbs_g" in updates:
        ingredient.carbs_g = updates["carbs_g"]
    if "fat_g" in updates:
        ingredient.fat_g = updates["fat_g"]
    if "price_amount" in updates:
        ingredient.price_amount = updates["price_amount"]
    if "price_currency" in updates:
        ingredient.price_currency = updates["price_currency"]

    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return ingredient.to_read()


def delete_ingredient(db: Session, ingredient_id: int) -> None:
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise LookupError(f"No ingredient found with id: {ingredient_id}")

    in_use = db.scalar(
        select(MealIngredient.id).where(MealIngredient.ingredient_id == ingredient_id).limit(1)
    )
    if in_use is not None:
        raise IngredientInUseError(
            f"Cannot delete '{ingredient.name}': it is used in one or more meals. "
            "Remove it from those meals first."
        )

    db.delete(ingredient)
    db.commit()
