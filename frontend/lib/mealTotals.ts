import type { Ingredient } from "@/types/ingredient";
import type { Meal } from "@/types/meal";

export type MealTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  priceIncomplete: boolean;
};

export function computeMealTotals(meal: Meal, ingredients: Ingredient[]): MealTotals {
  const totals: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, price: 0, priceIncomplete: false };

  for (const item of meal.ingredients) {
    const ing = ingredients.find((i) => i.id === item.ingredient_id);
    if (!ing) continue;

    // assume ingredient macros are per 100g of serving_unit; compute factor
    const factor = (Number(item.quantity_amount) || 0) / 100;
    totals.calories += (ing.macros.calories_kcal || 0) * factor;
    totals.protein += (ing.macros.protein_g || 0) * factor;
    totals.carbs += (ing.macros.carbs_g || 0) * factor;
    totals.fat += (ing.macros.fat_g || 0) * factor;

    if (ing.price.unit && ing.price.unit !== ing.serving_unit) {
      if (ing.price.servings_per_container && ing.price.servings_per_container > 0) {
        // Known conversion: price / servings gives an exact per-serving-unit
        // price, so it can be scaled by the same factor as macros.
        const pricePerServingUnit = ing.price.amount / ing.price.servings_per_container;
        totals.price += pricePerServingUnit * factor;
      } else {
        // Price is for an unknown-sized different quantity — scaling it by
        // the same factor as macros would be misleading. Skip it and flag
        // the total as incomplete rather than showing a fabricated number.
        totals.priceIncomplete = true;
      }
    } else {
      totals.price += (ing.price.amount || 0) * factor;
    }
  }

  return totals;
}
