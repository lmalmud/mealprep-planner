import { deleteFromApi, fetchFromApi, patchToApi, postToApi } from "@/lib/api";
import type {
  Ingredient,
  IngredientInput,
  IngredientResolveResult,
  IngredientUpdateInput,
} from "@/types/ingredient";

export async function fetchIngredients(): Promise<Ingredient[]> {
  return fetchFromApi<Ingredient[]>("/api/ingredients");
}

export async function searchIngredient(query: string): Promise<IngredientResolveResult> {
  return fetchFromApi<IngredientResolveResult>(
    `/api/ingredients/resolve?query=${encodeURIComponent(query)}`
  );
}

export async function createIngredient(payload: IngredientInput): Promise<Ingredient> {
  return postToApi<Ingredient>("/api/ingredients", payload);
}

export async function updateIngredient(
  id: number,
  payload: IngredientUpdateInput
): Promise<Ingredient> {
  return patchToApi<Ingredient>(`/api/ingredients/${id}`, payload);
}

export async function deleteIngredient(id: number): Promise<void> {
  return deleteFromApi(`/api/ingredients/${id}`);
}
