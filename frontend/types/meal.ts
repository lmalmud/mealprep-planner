export type MealIngredientInput = {
  ingredient_id: number;
  quantity_amount: number;
  quantity_unit: string;
};

export type MealIngredient = {
  ingredient_id: number;
  ingredient_name: string;
  quantity_amount: number;
  quantity_unit: string;
};

export type Meal = {
  id: number;
  name: string;
  description: string;
  total_servings: number;
  ingredients: MealIngredient[];
};

export type MealCreatePayload = {
  name: string;
  description: string;
  total_servings: number;
  ingredients: MealIngredientInput[];
};

export type MealUpdatePayload = Partial<{
  name: string;
  description: string;
  total_servings: number;
  ingredients: MealIngredientInput[];
}>;

export type MealPlanAssignment = {
  day_index: number;
  slot: string;
  meal_id: number;
  meal_name: string;
  servings: number;
};

export type MealPlan = {
  id: number;
  name: string;
  start_date: string;
  duration_days: number;
  assignments: MealPlanAssignment[];
};

export type MealPlanAssignmentPayload = {
  day_index: number;
  slot: string;
  meal_id: number;
  servings: number;
};

export type MealPlanCreatePayload = {
  name: string;
  start_date: string;
  duration_days: number;
  assignments: MealPlanAssignmentPayload[];
};

export type MealPlanUpdatePayload = Partial<{
  name: string;
  start_date: string;
  duration_days: number;
  assignments: MealPlanAssignmentPayload[];
}>;

export type GroceryListItem = {
  ingredient_id: number;
  ingredient_name: string;
  total_amount: number;
  total_unit: string;
  containers_needed: number | null;
  estimated_cost: number | null;
  currency: string | null;
  note: string | null;
};
