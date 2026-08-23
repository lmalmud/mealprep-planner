"use client";

import { useState } from "react";
import type { IngredientInput } from "@/types/ingredient";

type IngredientConfirmDialogProps = {
  candidate: IngredientInput;
  busy?: boolean;
  onConfirm: (edited: IngredientInput) => void;
  onCancel: () => void;
};

export default function IngredientConfirmDialog({
  candidate,
  busy = false,
  onConfirm,
  onCancel,
}: IngredientConfirmDialogProps) {
  const [name, setName] = useState(candidate.name);
  const [servingUnit, setServingUnit] = useState(candidate.serving_unit);
  const [calories, setCalories] = useState(String(candidate.macros.calories_kcal));
  const [protein, setProtein] = useState(String(candidate.macros.protein_g));
  const [carbs, setCarbs] = useState(String(candidate.macros.carbs_g));
  const [fat, setFat] = useState(String(candidate.macros.fat_g));
  const [priceAmount, setPriceAmount] = useState(String(candidate.price.amount));
  const [priceCurrency, setPriceCurrency] = useState(candidate.price.currency);

  function handleConfirm() {
    onConfirm({
      name: name.trim(),
      serving_unit: servingUnit.trim(),
      macros: {
        calories_kcal: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
      },
      price: {
        amount: Number(priceAmount) || 0,
        currency: priceCurrency.trim() || "USD",
      },
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-lg p-6">
        <h2 className="text-xl">Review new ingredient</h2>
        <p
          className="mt-3 rounded-[var(--radius-sm)] border px-3 py-2 text-xs leading-relaxed"
          style={{
            background: "var(--color-warning-soft)",
            borderColor: "var(--color-warning-border)",
            color: "var(--color-warning)",
          }}
        >
          This ingredient wasn&rsquo;t found in your saved list. Review the details below — especially
          price, which defaults to $0.00 — before adding it.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="text-sm font-medium text-[var(--color-fg-muted)]">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-[var(--color-fg-muted)]">
            Serving unit (basis for the values below, e.g. &quot;100g&quot;)
            <input
              value={servingUnit}
              onChange={(event) => setServingUnit(event.target.value)}
              className="field mt-1"
            />
          </label>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Calories
              <input
                type="number"
                min="0"
                step="0.1"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Protein (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Carbs (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={carbs}
                onChange={(event) => setCarbs(event.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Fat (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={fat}
                onChange={(event) => setFat(event.target.value)}
                className="field mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={(event) => setPriceAmount(event.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Currency
              <input
                value={priceCurrency}
                onChange={(event) => setPriceCurrency(event.target.value)}
                maxLength={3}
                className="field mt-1 uppercase"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !name.trim() || !servingUnit.trim()}
            className="btn btn-primary"
          >
            {busy ? "Saving…" : "Add ingredient"}
          </button>
        </div>
      </div>
    </div>
  );
}
