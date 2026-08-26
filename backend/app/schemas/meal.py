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
    total_servings: float = Field(default=1.0, gt=0)
    ingredients: list[MealIngredientCreate] = Field(default_factory=list)


class MealUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    total_servings: float | None = Field(default=None, gt=0)
    # When provided, replaces the meal's entire ingredient list.
    ingredients: list[MealIngredientCreate] | None = None


class MealRead(BaseModel):
    id: int
    name: str
    description: str
    total_servings: float
    ingredients: list[MealIngredientRead]


class MealPlanAssignmentCreate(BaseModel):
    day_index: int = Field(ge=0)
    slot: str = Field(min_length=1)
    meal_id: int = Field(ge=1)
    servings: float = Field(default=1.0, gt=0)


class MealPlanAssignmentRead(BaseModel):
    id: int
    day_index: int
    slot: str
    meal_id: int
    meal_name: str
    servings: float


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


class MealPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    start_date: str | None = None
    duration_days: int | None = Field(default=None, ge=1)
    # When provided, replaces the plan's entire assignment list.
    assignments: list[MealPlanAssignmentCreate] | None = None


class GroceryListItem(BaseModel):
    ingredient_id: int
    ingredient_name: str
    total_amount: float
    total_unit: str
    # None when a purchase-quantity estimate couldn't be computed (see `note`).
    containers_needed: float | None = None
    estimated_cost: float | None = None
    currency: str | None = None
    note: str | None = None
