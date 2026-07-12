from pydantic import BaseModel, Field


class IngredientMacros(BaseModel):
    calories_kcal: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)


class IngredientPrice(BaseModel):
    amount: float = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    unit: str


class IngredientRead(BaseModel):
    id: int = Field(ge=1)
    name: str
    macros: IngredientMacros
    price: IngredientPrice
