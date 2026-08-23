export type IngredientMacros = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type IngredientPrice = {
  amount: number;
  currency: string;
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
}>;

export type IngredientResolveResult =
  | { status: "existing"; ingredient: Ingredient }
  | { status: "preview"; candidate: IngredientInput };
