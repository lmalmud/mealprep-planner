import { fetchApiHealth } from "@/services/health";
import { fetchIngredients } from "@/services/ingredients";
import type { Ingredient } from "@/types/ingredient";

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
    <main className="p-6 space-y-2">
      <h1 className="text-xl font-semibold">MealPrep Planner</h1>
      <p>Project setup complete.</p>
      <p>{connectionStatus}</p>

      <section className="pt-4">
        <h2 className="text-lg font-medium">Ingredients</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Calories</th>
                <th className="py-2 pr-4">Protein (g)</th>
                <th className="py-2 pr-4">Carbs (g)</th>
                <th className="py-2 pr-4">Fat (g)</th>
                <th className="py-2 pr-4">Price</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => (
                <tr key={ingredient.id} className="border-b">
                  <td className="py-2 pr-4">{ingredient.name}</td>
                  <td className="py-2 pr-4">{ingredient.macros.calories_kcal}</td>
                  <td className="py-2 pr-4">{ingredient.macros.protein_g}</td>
                  <td className="py-2 pr-4">{ingredient.macros.carbs_g}</td>
                  <td className="py-2 pr-4">{ingredient.macros.fat_g}</td>
                  <td className="py-2 pr-4">
                    {ingredient.price.currency} {ingredient.price.amount.toFixed(2)} / {ingredient.price.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
