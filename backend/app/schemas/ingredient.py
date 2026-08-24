from typing import Literal

from pydantic import BaseModel, Field


class IngredientMacros(BaseModel):
    calories_kcal: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    fiber_g: float = Field(default=0.0, ge=0)
    sugar_g: float = Field(default=0.0, ge=0)


class IngredientServingRead(BaseModel):
    id: int
    label: str
    # None means the gram-equivalent isn't known, so this serving can't be
    # converted to/from any other unit yet.
    grams: float | None
    is_default: bool


class IngredientServingInput(BaseModel):
    label: str = Field(min_length=1)
    grams: float | None = Field(default=None, gt=0)
    is_default: bool = False
    # Whether `price` (on the parent Ingredient) refers to this serving.
    # If no serving in the list sets this, the default serving is used.
    is_price_serving: bool = False


class IngredientPrice(BaseModel):
    amount: float = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    # The id of the serving this price refers to (read-only info; set via
    # `is_price_serving` on the relevant entry in `servings` when writing).
    serving_id: int | None = None


class IngredientRead(BaseModel):
    id: int = Field(ge=1)
    name: str
    servings: list[IngredientServingRead]
    default_serving_id: int | None
    macros: IngredientMacros
    price: IngredientPrice
    # An optional link to where this ingredient's data came from (e.g. a
    # product page) — purely informational, for the user's own reference.
    source_url: str | None = None


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1)
    servings: list[IngredientServingInput] = Field(min_length=1)
    # Per whichever serving has is_default=True (or the first entry if none do).
    macros: IngredientMacros
    price: IngredientPrice
    source_url: str | None = Field(default=None, max_length=2048)


class IngredientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    calories_kcal: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)
    fiber_g: float | None = Field(default=None, ge=0)
    sugar_g: float | None = Field(default=None, ge=0)
    price_amount: float | None = Field(default=None, ge=0)
    price_currency: str | None = Field(default=None, min_length=3, max_length=3)
    source_url: str | None = Field(default=None, max_length=2048)
    # When provided, replaces the ingredient's entire servings list.
    servings: list[IngredientServingInput] | None = None


class IngredientResolveResult(BaseModel):
    status: Literal["existing", "preview"]
    ingredient: IngredientRead | None = None
    candidate: IngredientCreate | None = None
