from typing import Literal

from pydantic import BaseModel, Field


class IngredientMacros(BaseModel):
    calories_kcal: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class IngredientPrice(BaseModel):
    amount: float = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    # Set only when the price refers to a different quantity than `serving_unit`
    # (e.g. macros are "per 15g serving" but the price is for a 480g package).
    # None means the price is assumed to be for the same quantity as serving_unit.
    unit: str | None = Field(default=None, min_length=1)
    # How many serving_unit-sized servings `unit` (the priced quantity) contains.
    # When set, price-per-serving = amount / servings_per_container, enabling an
    # exact cost calculation instead of just flagging the total as incomplete.
    servings_per_container: float | None = Field(default=None, gt=0)


class IngredientRead(BaseModel):
    id: int = Field(ge=1)
    name: str
    serving_unit: str
    macros: IngredientMacros
    price: IngredientPrice


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1)
    serving_unit: str = Field(min_length=1)
    macros: IngredientMacros
    price: IngredientPrice


class IngredientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    serving_unit: str | None = Field(default=None, min_length=1)
    calories_kcal: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)
    price_amount: float | None = Field(default=None, ge=0)
    price_currency: str | None = Field(default=None, min_length=3, max_length=3)
    price_unit: str | None = Field(default=None, min_length=1)
    price_servings_per_container: float | None = Field(default=None, gt=0)


class IngredientResolveResult(BaseModel):
    status: Literal["existing", "preview"]
    ingredient: IngredientRead | None = None
    candidate: IngredientCreate | None = None
