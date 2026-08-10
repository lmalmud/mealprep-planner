from pydantic import BaseModel, Field


class MealIngredientCreate(BaseModel):
    ingredient_id: int = Field(ge=1)
    quantity_amount: float = Field(ge=0)
    quantity_unit: str = Field(min_length=1)


class MealIngredientRead(BaseModel):
    ingredient_id: int
    ingredient_name: str
    quantity_amount: float
    quantity_unit: str


class MealCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    ingredients: list[MealIngredientCreate] = Field(default_factory=list)


class MealRead(BaseModel):
    id: int
    name: str
    description: str
    ingredients: list[MealIngredientRead]


class MealPlanAssignmentCreate(BaseModel):
    day_index: int = Field(ge=0)
    slot: str = Field(min_length=1)
    meal_id: int = Field(ge=1)


class MealPlanAssignmentRead(BaseModel):
    id: int
    day_index: int
    slot: str
    meal_id: int
    meal_name: str


class MealPlanCreate(BaseModel):
    name: str = Field(min_length=1)
    start_date: str
    duration_days: int = Field(ge=1)
    assignments: list[MealPlanAssignmentCreate] = Field(default_factory=list)


class MealPlanRead(BaseModel):
    id: int
    name: str
    start_date: str
    duration_days: int
    assignments: list[MealPlanAssignmentRead]
