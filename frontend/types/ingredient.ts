export type IngredientMacros = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
};

export type IngredientServing = {
  id: number;
  label: string;
  // None means the gram-equivalent isn't known, so this serving can't be
  // converted to/from any other unit yet.
  grams: number | null;
  is_default: boolean;
};

export type IngredientServingInput = {
  label: string;
  grams: number | null;
  is_default: boolean;
  is_price_serving: boolean;
};

export type IngredientPrice = {
  amount: number;
  currency: string;
  // The id of the serving (from `servings`) this price refers to.
  serving_id: number | null;
};

export type Ingredient = {
  id: number;
  name: string;
  servings: IngredientServing[];
  default_serving_id: number | null;
  macros: IngredientMacros;
  price: IngredientPrice;
  source_url: string | null;
};

export type IngredientInput = {
  name: string;
  servings: IngredientServingInput[];
  macros: IngredientMacros;
  price: { amount: number; currency: string };
  source_url?: string | null;
};

export type IngredientUpdateInput = Partial<{
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  price_amount: number;
  price_currency: string;
  source_url: string | null;
  servings: IngredientServingInput[];
}>;

export type IngredientResolveResult =
  | { status: "existing"; ingredient: Ingredient }
  | { status: "preview"; candidate: IngredientInput };
