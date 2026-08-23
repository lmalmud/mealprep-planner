import { fetchApiHealth } from "@/services/health";
import { fetchIngredients } from "@/services/ingredients";
import type { Ingredient } from "@/types/ingredient";
import NavBar from "@/components/NavBar";
import IngredientManager from "@/components/IngredientManager";

export default async function HomePage() {
  let connectionStatus = "Backend unreachable";
  let ingredients: Ingredient[] = [];

  try {
    const health = await fetchApiHealth();
    ingredients = await fetchIngredients();
    connectionStatus = `Backend status: ${health.status}`;
  } catch {
    connectionStatus = "Backend unreachable";
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <h1 className="text-4xl">MealPrep Planner</h1>
            <p className="mt-3 max-w-md text-[var(--color-fg-muted)]">
              Plan meals, track macros, and estimate cost.
            </p>
          </div>
          <div className="text-sm text-[var(--color-fg-faint)]">{connectionStatus}</div>
        </div>

        <IngredientManager initialIngredients={ingredients} />
      </main>
    </div>
  );
}
