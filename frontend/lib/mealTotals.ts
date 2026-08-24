import { gramsForQuantity } from "@/lib/units";
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

    const defaultServing = ing.servings.find((s) => s.id === ing.default_serving_id);
    const grams = gramsForQuantity(item.quantity_amount, item.quantity_unit, ing.servings);

    // Macros are stored "per default serving" — converting to the meal's
    // quantity requires knowing both the quantity's grams and the default
    // serving's grams. When either is unknown, skip macros for this
    // ingredient rather than computing a meaningless number.
    if (grams !== null && defaultServing?.grams) {
      const factor = grams / defaultServing.grams;
      totals.calories += (ing.macros.calories_kcal || 0) * factor;
      totals.protein += (ing.macros.protein_g || 0) * factor;
      totals.carbs += (ing.macros.carbs_g || 0) * factor;
      totals.fat += (ing.macros.fat_g || 0) * factor;
    }

    const priceServing = ing.servings.find((s) => s.id === ing.price.serving_id) ?? defaultServing;
    if (grams !== null && priceServing?.grams) {
      const pricePerGram = ing.price.amount / priceServing.grams;
      totals.price += pricePerGram * grams;
    } else {
      totals.priceIncomplete = true;
    }
  }

  return totals;
}
