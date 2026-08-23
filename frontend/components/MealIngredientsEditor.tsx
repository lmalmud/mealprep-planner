"use client";

import IngredientCombobox from "@/components/IngredientCombobox";
import { parseServingUnit } from "@/lib/units";
import type { Ingredient } from "@/types/ingredient";

export type MealIngredientDraft = {
  ingredient_id: string;
  quantity_amount: string;
  quantity_unit: string;
};

export const EMPTY_MEAL_INGREDIENT_DRAFT: MealIngredientDraft = {
  ingredient_id: "",
  quantity_amount: "",
  quantity_unit: "g",
};

type MealIngredientsEditorProps = {
  ingredients: Ingredient[];
  entries: MealIngredientDraft[];
  onChange: (entries: MealIngredientDraft[]) => void;
  onRequestAdd: (rowIndex: number, query: string) => void;
};

export default function MealIngredientsEditor({
  ingredients,
  entries,
  onChange,
  onRequestAdd,
}: MealIngredientsEditorProps) {
  function updateEntry(index: number, field: keyof MealIngredientDraft, value: string) {
    onChange(entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)));
  }

  function selectIngredient(index: number, ingredient: Ingredient) {
    const parsed = parseServingUnit(ingredient.serving_unit);
    onChange(
      entries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              ingredient_id: String(ingredient.id),
              quantity_amount: parsed ? String(parsed.amount) : entry.quantity_amount,
              quantity_unit: parsed ? parsed.unit : entry.quantity_unit,
            }
          : entry
      )
    );
  }

  function addRow() {
    onChange([...entries, { ...EMPTY_MEAL_INGREDIENT_DRAFT }]);
  }

  function removeRow(index: number) {
    onChange(entries.filter((_, entryIndex) => entryIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">Foods in this meal</h3>
        <button type="button" onClick={addRow} className="btn btn-secondary btn-sm">
          Add food
        </button>
      </div>

      {entries.map((entry, index) => (
        <div
          key={`${entry.ingredient_id}-${index}`}
          className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 md:grid-cols-[2fr_1fr_1fr_auto]"
        >
          <label className="text-sm font-medium text-[var(--color-fg-muted)]">
            Food
            <IngredientCombobox
              ingredients={ingredients}
              value={entry.ingredient_id}
              onSelect={(ingredient) => selectIngredient(index, ingredient)}
              onRequestAdd={(query) => onRequestAdd(index, query)}
            />
          </label>

          <label className="text-sm font-medium text-[var(--color-fg-muted)]">
            Quantity
            <input
              value={entry.quantity_amount}
              onChange={(event) => updateEntry(index, "quantity_amount", event.target.value)}
              className="field mt-1"
              placeholder="200"
              type="number"
              min="0"
              step="0.1"
            />
          </label>

          <label className="text-sm font-medium text-[var(--color-fg-muted)]">
            Unit
            <input
              value={entry.quantity_unit}
              onChange={(event) => updateEntry(index, "quantity_unit", event.target.value)}
              className="field mt-1"
              placeholder="g"
            />
          </label>

          <button type="button" onClick={() => removeRow(index)} className="btn btn-danger self-end">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
