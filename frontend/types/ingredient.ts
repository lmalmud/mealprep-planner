export type IngredientMacros = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type IngredientPrice = {
  amount: number;
  currency: string;
  unit: string;
};

export type Ingredient = {
  id: number;
  name: string;
  macros: IngredientMacros;
  price: IngredientPrice;
};
