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


class IngredientResolveResult(BaseModel):
    status: Literal["existing", "preview"]
    ingredient: IngredientRead | None = None
    candidate: IngredientCreate | None = None
