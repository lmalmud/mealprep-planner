export type IngredientMacros = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type IngredientPrice = {
  amount: number;
  currency: string;
  // Set only when the price is for a different quantity than `serving_unit`
  // (e.g. macros are per 15g serving but the price is for a 480g package).
  unit?: string | null;
  // How many serving_unit-sized servings `unit` contains. When set, price per
  // serving_unit = amount / servings_per_container, enabling an exact cost
  // calculation instead of treating the total as incomplete.
  servings_per_container?: number | null;
};

export type Ingredient = {
  id: number;
  name: string;
  serving_unit: string;
  macros: IngredientMacros;
  price: IngredientPrice;
};

export type IngredientInput = {
  name: string;
  serving_unit: string;
  macros: IngredientMacros;
  price: IngredientPrice;
};

export type IngredientUpdateInput = Partial<{
  name: string;
  serving_unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  price_amount: number;
  price_currency: string;
  price_unit: string | null;
  price_servings_per_container: number | null;
}>;

export type IngredientResolveResult =
  | { status: "existing"; ingredient: Ingredient }
  | { status: "preview"; candidate: IngredientInput };
