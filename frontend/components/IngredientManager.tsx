"use client";

import { useState } from "react";
import { deleteIngredient, getIngredientUsage, updateIngredient } from "@/services/ingredients";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import ServingsEditor, { buildServingInputs, draftFromServing, type ServingDraft } from "@/components/ServingsEditor";
import type { Ingredient, IngredientUpdateInput } from "@/types/ingredient";
import ConfirmDialog from "@/components/ConfirmDialog";
import IngredientConfirmDialog from "@/components/IngredientConfirmDialog";
import IngredientQuickAddPanel from "@/components/IngredientQuickAddPanel";

type EditDraft = {
  name: string;
  source_url: string;
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  sugar_g: string;
  price_amount: string;
  price_currency: string;
  servings: ServingDraft[];
};

function toDraft(ingredient: Ingredient): EditDraft {
  return {
    name: ingredient.name,
    source_url: ingredient.source_url ?? "",
    calories_kcal: String(ingredient.macros.calories_kcal),
    protein_g: String(ingredient.macros.protein_g),
    carbs_g: String(ingredient.macros.carbs_g),
    fat_g: String(ingredient.macros.fat_g),
    fiber_g: String(ingredient.macros.fiber_g),
    sugar_g: String(ingredient.macros.sugar_g),
    price_amount: String(ingredient.price.amount),
    price_currency: ingredient.price.currency,
    servings: ingredient.servings.map((s) =>
      draftFromServing(s.label, s.grams, s.id === ingredient.default_serving_id, s.id === ingredient.price.serving_id)
    ),
  };
}

function formatPricePreview(ingredient: Ingredient): string | null {
  const priceServing =
    ingredient.servings.find((s) => s.id === ingredient.price.serving_id) ??
    ingredient.servings.find((s) => s.id === ingredient.default_serving_id);
  if (!priceServing?.grams) return null;
  const defaultServing = ingredient.servings.find((s) => s.id === ingredient.default_serving_id);
  const pricePerGram = ingredient.price.amount / priceServing.grams;
  if (!defaultServing?.grams || defaultServing.id === priceServing.id) return null;
  const perDefault = pricePerGram * defaultServing.grams;
  return `≈ ${ingredient.price.currency} ${perDefault.toFixed(2)} per ${defaultServing.label}`;
}

export default function IngredientManager({ initialIngredients }: { initialIngredients: Ingredient[] }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteAffectedMeals, setDeleteAffectedMeals] = useState<string[]>([]);
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    pendingCandidate,
    searching,
    creating,
    feedback,
    search,
    searchByUrl,
    confirmCandidate,
    cancelCandidate,
  } = useIngredientSearch({
    onAdded: (ingredient) => {
      setIngredients((previous) => {
        const exists = previous.some((item) => item.id === ingredient.id);
        return exists
          ? previous.map((item) => (item.id === ingredient.id ? ingredient : item))
          : [ingredient, ...previous];
      });
    },
  });

  function startEdit(ingredient: Ingredient) {
    setEditingId(ingredient.id);
    setEditDraft(toDraft(ingredient));
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setEditError("");
  }

  function updateServings(servings: ServingDraft[]) {
    setEditDraft((previous) => (previous ? { ...previous, servings } : previous));
  }

  async function saveEdit(id: number) {
    if (!editDraft) return;
    setEditError("");

    const servings = buildServingInputs(editDraft.servings);

    if (!servings.length) {
      setEditError("Add at least one serving.");
      return;
    }

    const payload: IngredientUpdateInput = {
      name: editDraft.name.trim(),
      source_url: editDraft.source_url.trim() || null,
      calories_kcal: Number(editDraft.calories_kcal) || 0,
      protein_g: Number(editDraft.protein_g) || 0,
      carbs_g: Number(editDraft.carbs_g) || 0,
      fat_g: Number(editDraft.fat_g) || 0,
      fiber_g: Number(editDraft.fiber_g) || 0,
      sugar_g: Number(editDraft.sugar_g) || 0,
      price_amount: Number(editDraft.price_amount) || 0,
      price_currency: editDraft.price_currency.trim() || "USD",
      servings,
    };

    try {
      setSavingEdit(true);
      const updated = await updateIngredient(id, payload);
      setIngredients((previous) => previous.map((item) => (item.id === id ? updated : item)));
      cancelEdit();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function startDelete(ingredientId: number) {
    setDeleteError("");
    setDeleteAffectedMeals([]);
    setDeleteTargetId(ingredientId);
    try {
      setCheckingUsage(true);
      const mealNames = await getIngredientUsage(ingredientId);
      setDeleteAffectedMeals(mealNames);
    } catch {
      // If the usage check fails, proceed without the extra warning — delete
      // itself will still succeed (or report a real error) either way.
    } finally {
      setCheckingUsage(false);
    }
  }

  async function confirmDelete() {
    if (deleteTargetId === null) return;
    setDeleteError("");

    try {
      setDeleting(true);
      await deleteIngredient(deleteTargetId);
      setIngredients((previous) => previous.filter((item) => item.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this ingredient.");
    } finally {
      setDeleting(false);
    }
  }

  const deleteTarget = ingredients.find((item) => item.id === deleteTargetId) ?? null;

  return (
    <section className="pt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Ingredients</h2>
      </div>

      <div className="mt-4">
        <IngredientQuickAddPanel
          search={search}
          searchByUrl={searchByUrl}
          searching={searching}
          feedback={feedback}
        />
      </div>

      <div className="surface-card mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-fg-faint)]">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Calories</th>
              <th className="px-4 py-3 font-medium">Protein (g)</th>
              <th className="px-4 py-3 font-medium">Carbs (g)</th>
              <th className="px-4 py-3 font-medium">Fat (g)</th>
              <th className="px-4 py-3 font-medium">Fiber (g)</th>
              <th className="px-4 py-3 font-medium">Sugar (g)</th>
              <th className="px-4 py-3 font-medium">Servings &amp; units</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => {
              const isEditing = editingId === ingredient.id;
              const defaultServing = ingredient.servings.find((s) => s.id === ingredient.default_serving_id);
              const priceServing =
                ingredient.servings.find((s) => s.id === ingredient.price.serving_id) ?? defaultServing;
              const pricePreview = formatPricePreview(ingredient);
              return (
                <tr
                  key={ingredient.id}
                  className="border-b border-[var(--color-border)] align-top last:border-b-0"
                >
                  {isEditing && editDraft ? (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <input
                            value={editDraft.name}
                            onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                            className="field field-sm w-32"
                          />
                          <input
                            value={editDraft.source_url}
                            onChange={(event) => setEditDraft({ ...editDraft, source_url: event.target.value })}
                            className="field field-sm w-32"
                            placeholder="Link (optional)"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editDraft.calories_kcal}
                          onChange={(event) => setEditDraft({ ...editDraft, calories_kcal: event.target.value })}
                          className="field field-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editDraft.protein_g}
                          onChange={(event) => setEditDraft({ ...editDraft, protein_g: event.target.value })}
                          className="field field-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editDraft.carbs_g}
                          onChange={(event) => setEditDraft({ ...editDraft, carbs_g: event.target.value })}
                          className="field field-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editDraft.fat_g}
                          onChange={(event) => setEditDraft({ ...editDraft, fat_g: event.target.value })}
                          className="field field-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editDraft.fiber_g}
                          onChange={(event) => setEditDraft({ ...editDraft, fiber_g: event.target.value })}
                          className="field field-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editDraft.sugar_g}
                          onChange={(event) => setEditDraft({ ...editDraft, sugar_g: event.target.value })}
                          className="field field-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-[22rem]">
                          <ServingsEditor
                            servings={editDraft.servings}
                            onChange={updateServings}
                            idPrefix={`ingredient-${ingredient.id}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={editDraft.price_amount}
                              onChange={(event) => setEditDraft({ ...editDraft, price_amount: event.target.value })}
                              className="field field-sm w-16"
                            />
                            <input
                              value={editDraft.price_currency}
                              onChange={(event) => setEditDraft({ ...editDraft, price_currency: event.target.value })}
                              maxLength={3}
                              className="field field-sm w-12 uppercase"
                            />
                          </div>
                          <p className="text-xs text-[var(--color-fg-faint)]">
                            For the unit chosen as &quot;Price above is for&quot; on the left.
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveEdit(ingredient.id)}
                            disabled={savingEdit}
                            className="btn btn-primary btn-sm"
                          >
                            {savingEdit ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="btn btn-secondary btn-sm"
                          >
                            Cancel
                          </button>
                          {editError ? (
                            <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                              {editError}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-[var(--color-fg)]">
                        {ingredient.name}
                        {ingredient.source_url ? (
                          <a
                            href={ingredient.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-subtle ml-1.5 text-xs font-normal"
                            title={ingredient.source_url}
                          >
                            🔗
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{ingredient.macros.calories_kcal}</td>
                      <td className="px-4 py-3">{ingredient.macros.protein_g}</td>
                      <td className="px-4 py-3">{ingredient.macros.carbs_g}</td>
                      <td className="px-4 py-3">{ingredient.macros.fat_g}</td>
                      <td className="px-4 py-3">{ingredient.macros.fiber_g}</td>
                      <td className="px-4 py-3">{ingredient.macros.sugar_g}</td>
                      <td className="px-4 py-3 text-[var(--color-fg-faint)]">
                        <div>per {defaultServing?.label ?? "—"}</div>
                        {ingredient.servings.length > 1 ? (
                          <div className="text-xs">
                            + {ingredient.servings.length - 1} other unit{ingredient.servings.length > 2 ? "s" : ""}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {ingredient.price.currency} {ingredient.price.amount.toFixed(2)}
                        {priceServing ? (
                          <span className="text-[var(--color-fg-faint)]"> / {priceServing.label}</span>
                        ) : null}
                        {pricePreview ? (
                          <div className="text-xs text-[var(--color-fg-faint)]">{pricePreview}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(ingredient)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => startDelete(ingredient.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pendingCandidate ? (
        <IngredientConfirmDialog
          candidate={pendingCandidate}
          busy={creating}
          onConfirm={confirmCandidate}
          onCancel={cancelCandidate}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete ingredient?"
          message={
            deleteError ||
            (checkingUsage
              ? "Checking whether this ingredient is used in any meals…"
              : deleteAffectedMeals.length
                ? `"${deleteTarget.name}" is used in ${deleteAffectedMeals.length} meal(s): ${deleteAffectedMeals.join(", ")}. Deleting it will also delete ${deleteAffectedMeals.length === 1 ? "that meal" : "those meals"}.`
                : `This will permanently remove "${deleteTarget.name}" from your ingredients.`)
          }
          confirmLabel="Delete"
          busy={deleting || checkingUsage}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTargetId(null);
            setDeleteError("");
            setDeleteAffectedMeals([]);
          }}
        />
      ) : null}
    </section>
  );
}
