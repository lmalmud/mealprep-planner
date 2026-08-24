import { deleteFromApi, fetchFromApi, patchToApi, postToApi } from "@/lib/api";
import type {
  GroceryListItem,
  Meal,
  MealCreatePayload,
  MealPlan,
  MealPlanCreatePayload,
  MealPlanUpdatePayload,
  MealUpdatePayload,
} from "@/types/meal";

export async function fetchMeals(): Promise<Meal[]> {
  return fetchFromApi<Meal[]>("/api/meals");
}

export async function createMeal(payload: MealCreatePayload): Promise<Meal> {
  return postToApi<Meal>("/api/meals", payload);
}

export async function updateMeal(id: number, payload: MealUpdatePayload): Promise<Meal> {
  return patchToApi<Meal>(`/api/meals/${id}`, payload);
}

export async function deleteMeal(id: number): Promise<void> {
  return deleteFromApi(`/api/meals/${id}`);
}

export async function getMealUsage(id: number): Promise<string[]> {
  return fetchFromApi<string[]>(`/api/meals/${id}/usage`);
}

export async function fetchMealPlans(): Promise<MealPlan[]> {
  return fetchFromApi<MealPlan[]>("/api/meal-plans");
}

export async function fetchMealPlan(id: number): Promise<MealPlan> {
  return fetchFromApi<MealPlan>(`/api/meal-plans/${id}`);
}

export async function createMealPlan(payload: MealPlanCreatePayload): Promise<MealPlan> {
  return postToApi<MealPlan>("/api/meal-plans", payload);
}

export async function updateMealPlan(id: number, payload: MealPlanUpdatePayload): Promise<MealPlan> {
  return patchToApi<MealPlan>(`/api/meal-plans/${id}`, payload);
}

export async function deleteMealPlan(id: number): Promise<void> {
  return deleteFromApi(`/api/meal-plans/${id}`);
}

export async function fetchGroceryList(planId: number): Promise<GroceryListItem[]> {
  return fetchFromApi<GroceryListItem[]>(`/api/meal-plans/${planId}/grocery-list`);
}
