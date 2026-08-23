"use client";

import { useState } from "react";
import { updateMeal } from "@/services/planner";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { computeMealTotals } from "@/lib/mealTotals";
import MealIngredientsEditor, {
  EMPTY_MEAL_INGREDIENT_DRAFT,
  type MealIngredientDraft,
} from "@/components/MealIngredientsEditor";
import IngredientConfirmDialog from "@/components/IngredientConfirmDialog";
import type { Ingredient } from "@/types/ingredient";
import type { Meal } from "@/types/meal";

type EditDraft = {
  name: string;
  description: string;
  ingredients: MealIngredientDraft[];
};

function toDraft(meal: Meal): EditDraft {
  return {
    name: meal.name,
    description: meal.description,
    ingredients: meal.ingredients.length
      ? meal.ingredients.map((item) => ({
          ingredient_id: String(item.ingredient_id),
          quantity_amount: String(item.quantity_amount),
          quantity_unit: item.quantity_unit,
        }))
      : [{ ...EMPTY_MEAL_INGREDIENT_DRAFT }],
  };
}

export default function MealManager({
  initialMeals,
  ingredients: initialIngredients,
}: {
  initialMeals: Meal[];
  ingredients: Ingredient[];
}) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [addingForRowIndex, setAddingForRowIndex] = useState<number | null>(null);

  const { pendingCandidate, creating, search, confirmCandidate, cancelCandidate } = useIngredientSearch({
    onAdded: (ingredient) => {
      setIngredients((previous) => {
        const exists = previous.some((item) => item.id === ingredient.id);
        return exists ? previous : [ingredient, ...previous];
      });
      if (addingForRowIndex !== null && editDraft) {
        const index = addingForRowIndex;
        setEditDraft({
          ...editDraft,
          ingredients: editDraft.ingredients.map((entry, entryIndex) =>
            entryIndex === index ? { ...entry, ingredient_id: String(ingredient.id) } : entry
          ),
        });
        setAddingForRowIndex(null);
      }
    },
  });

  function startEdit(meal: Meal) {
    setEditingMealId(meal.id);
    setEditDraft(toDraft(meal));
    setEditError("");
  }

  function cancelEdit() {
    setEditingMealId(null);
    setEditDraft(null);
    setEditError("");
  }

  async function saveEdit(id: number) {
    if (!editDraft) return;
    setEditError("");

    if (!editDraft.name.trim()) {
      setEditError("Please give the meal a name.");
      return;
    }

    const normalizedIngredients = editDraft.ingredients
      .filter((entry) => entry.ingredient_id && entry.quantity_amount)
      .map((entry) => ({
        ingredient_id: Number(entry.ingredient_id),
        quantity_amount: Number(entry.quantity_amount),
        quantity_unit: entry.quantity_unit.trim() || "g",
      }));

    if (!normalizedIngredients.length) {
      setEditError("Add at least one food and quantity.");
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await updateMeal(id, {
        name: editDraft.name.trim(),
        description: editDraft.description.trim(),
        ingredients: normalizedIngredients,
      });
      setMeals((previous) => previous.map((meal) => (meal.id === id ? updated : meal)));
      cancelEdit();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  function requestAddIngredientForRow(index: number, query: string) {
    setAddingForRowIndex(index);
    void search(query);
  }

  function renderMealSummary(meal: Meal) {
    const totals = computeMealTotals(meal, ingredients);
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-muted)]">
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          {totals.calories.toFixed(0)} cal
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          P {totals.protein.toFixed(1)}g
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          C {totals.carbs.toFixed(1)}g
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          F {totals.fat.toFixed(1)}g
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          {ingredients[0]?.price.currency ?? "USD"} {totals.price.toFixed(2)}
          {totals.priceIncomplete ? "+" : ""}
        </span>
      </div>
    );
  }

  return (
    <section className="pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Saved meals</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
        Create new meals from the planner page. Edit their foods and quantities here.
      </p>

      <div className="mt-4 grid gap-3">
        {meals.length ? (
          meals.map((meal) => {
            const isEditing = editingMealId === meal.id;
            return (
              <div key={meal.id} className="surface-card p-5">
                {isEditing && editDraft ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block text-sm font-medium text-[var(--color-fg-muted)]">
                        Meal name
                        <input
                          value={editDraft.name}
                          onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                          className="field mt-1"
                        />
                      </label>
                      <label className="block text-sm font-medium text-[var(--color-fg-muted)]">
                        Description
                        <input
                          value={editDraft.description}
                          onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })}
                          className="field mt-1"
                        />
                      </label>
                    </div>

                    <MealIngredientsEditor
                      ingredients={ingredients}
                      entries={editDraft.ingredients}
                      onChange={(entries) => setEditDraft({ ...editDraft, ingredients: entries })}
                      onRequestAdd={requestAddIngredientForRow}
                    />

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => saveEdit(meal.id)}
                        disabled={savingEdit}
                        className="btn btn-primary"
                      >
                        {savingEdit ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      {editError ? (
                        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
                          {editError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-[var(--color-fg)]">{meal.name}</div>
                      {meal.description ? (
                        <div className="text-sm text-[var(--color-fg-muted)]">{meal.description}</div>
                      ) : null}
                      <ul className="mt-2 text-sm text-[var(--color-fg-muted)]">
                        {meal.ingredients.map((item) => (
                          <li key={item.ingredient_id}>
                            {item.ingredient_name} — {item.quantity_amount}
                            {item.quantity_unit}
                          </li>
                        ))}
                      </ul>
                      {renderMealSummary(meal)}
                    </div>
                    <button type="button" onClick={() => startEdit(meal)} className="btn btn-secondary btn-sm">
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-sm text-[var(--color-fg-faint)]">
            No saved meals yet — create one from the planner page.
          </div>
        )}
      </div>

      {pendingCandidate ? (
        <IngredientConfirmDialog
          candidate={pendingCandidate}
          busy={creating}
          onConfirm={confirmCandidate}
          onCancel={cancelCandidate}
        />
      ) : null}
    </section>
  );
}
