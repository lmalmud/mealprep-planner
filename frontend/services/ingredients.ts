import { fetchFromApi } from "@/lib/api";
import type { Ingredient } from "@/types/ingredient";

export async function fetchIngredients(): Promise<Ingredient[]> {
  return fetchFromApi<Ingredient[]>("/api/ingredients");
}
