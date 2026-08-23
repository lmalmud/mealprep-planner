"use client";

import { useState } from "react";
import { deleteIngredient, updateIngredient } from "@/services/ingredients";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import type { Ingredient, IngredientUpdateInput } from "@/types/ingredient";
import ConfirmDialog from "@/components/ConfirmDialog";
import IngredientConfirmDialog from "@/components/IngredientConfirmDialog";
import IngredientQuickAddPanel from "@/components/IngredientQuickAddPanel";

type EditDraft = {
  name: string;
  serving_unit: string;
  calories_kcal: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  price_amount: string;
  price_currency: string;
  price_unit: string;
};

function toDraft(ingredient: Ingredient): EditDraft {
  return {
    name: ingredient.name,
    serving_unit: ingredient.serving_unit,
    calories_kcal: String(ingredient.macros.calories_kcal),
    protein_g: String(ingredient.macros.protein_g),
    carbs_g: String(ingredient.macros.carbs_g),
    fat_g: String(ingredient.macros.fat_g),
    price_amount: String(ingredient.price.amount),
    price_currency: ingredient.price.currency,
    price_unit: ingredient.price.unit ?? "",
  };
}

export default function IngredientManager({ initialIngredients }: { initialIngredients: Ingredient[] }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
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

  async function saveEdit(id: number) {
    if (!editDraft) return;
    setEditError("");

    const payload: IngredientUpdateInput = {
      name: editDraft.name.trim(),
      serving_unit: editDraft.serving_unit.trim(),
      calories_kcal: Number(editDraft.calories_kcal) || 0,
      protein_g: Number(editDraft.protein_g) || 0,
      carbs_g: Number(editDraft.carbs_g) || 0,
      fat_g: Number(editDraft.fat_g) || 0,
      price_amount: Number(editDraft.price_amount) || 0,
      price_currency: editDraft.price_currency.trim() || "USD",
      price_unit: editDraft.price_unit.trim() || null,
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
              <th className="px-4 py-3 font-medium">Per</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => {
              const isEditing = editingId === ingredient.id;
              return (
                <tr
                  key={ingredient.id}
                  className="border-b border-[var(--color-border)] align-top last:border-b-0"
                >
                  {isEditing && editDraft ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          value={editDraft.name}
                          onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                          className="field field-sm w-32"
                        />
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
                          value={editDraft.serving_unit}
                          onChange={(event) => setEditDraft({ ...editDraft, serving_unit: event.target.value })}
                          className="field field-sm w-20"
                        />
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
                          <input
                            value={editDraft.price_unit}
                            onChange={(event) => setEditDraft({ ...editDraft, price_unit: event.target.value })}
                            className="field field-sm w-32"
                            placeholder="per (if different)"
                          />
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
                      <td className="px-4 py-3 font-medium text-[var(--color-fg)]">{ingredient.name}</td>
                      <td className="px-4 py-3">{ingredient.macros.calories_kcal}</td>
                      <td className="px-4 py-3">{ingredient.macros.protein_g}</td>
                      <td className="px-4 py-3">{ingredient.macros.carbs_g}</td>
                      <td className="px-4 py-3">{ingredient.macros.fat_g}</td>
                      <td className="px-4 py-3 text-[var(--color-fg-faint)]">per {ingredient.serving_unit}</td>
                      <td className="px-4 py-3">
                        {ingredient.price.currency} {ingredient.price.amount.toFixed(2)}
                        {ingredient.price.unit ? (
                          <span className="text-[var(--color-fg-faint)]"> / {ingredient.price.unit}</span>
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
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTargetId(ingredient.id);
                            }}
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
            `This will permanently remove "${deleteTarget.name}" from your ingredients.`
          }
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTargetId(null);
            setDeleteError("");
          }}
        />
      ) : null}
    </section>
  );
}
