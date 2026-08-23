import { fetchFromApi, postToApi } from "@/lib/api";
import type { Meal, MealCreatePayload, MealPlan, MealPlanCreatePayload } from "@/types/meal";

export async function fetchMeals(): Promise<Meal[]> {
  return fetchFromApi<Meal[]>("/api/meals");
}

export async function createMeal(payload: MealCreatePayload): Promise<Meal> {
  return postToApi<Meal>("/api/meals", payload);
}

export async function fetchMealPlans(): Promise<MealPlan[]> {
  return fetchFromApi<MealPlan[]>("/api/meal-plans");
}

export async function createMealPlan(payload: MealPlanCreatePayload): Promise<MealPlan> {
  return postToApi<MealPlan>("/api/meal-plans", payload);
}
