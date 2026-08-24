"use client";

import { useState } from "react";
import ServingsEditor, {
  buildServingInputs,
  draftFromServing,
  gramsForDraft,
  labelForDraft,
  newServingDraft,
  type ServingDraft,
} from "@/components/ServingsEditor";
import type { IngredientInput, IngredientServingInput } from "@/types/ingredient";

function toServingDrafts(servings: IngredientServingInput[]): ServingDraft[] {
  if (!servings.length) return [newServingDraft()];
  return servings.map((s) => draftFromServing(s.label, s.grams, s.is_default, s.is_price_serving));
}

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
  const [sourceUrl, setSourceUrl] = useState(candidate.source_url ?? "");
  const [calories, setCalories] = useState(String(candidate.macros.calories_kcal));
  const [protein, setProtein] = useState(String(candidate.macros.protein_g));
  const [carbs, setCarbs] = useState(String(candidate.macros.carbs_g));
  const [fat, setFat] = useState(String(candidate.macros.fat_g));
  const [fiber, setFiber] = useState(String(candidate.macros.fiber_g));
  const [sugar, setSugar] = useState(String(candidate.macros.sugar_g));
  const [priceAmount, setPriceAmount] = useState(String(candidate.price.amount));
  const [priceCurrency, setPriceCurrency] = useState(candidate.price.currency);
  const [servings, setServings] = useState<ServingDraft[]>(() => toServingDrafts(candidate.servings));

  const defaultServing = servings.find((s) => s.isDefault) ?? servings[0];
  const priceServing = servings.find((s) => s.isPriceServing) ?? defaultServing;
  const priceServingGrams = priceServing ? gramsForDraft(priceServing, servings) : null;
  const defaultServingGrams = defaultServing ? gramsForDraft(defaultServing, servings) : null;
  const pricePerGram = priceServingGrams ? (Number(priceAmount) || 0) / priceServingGrams : null;
  const pricePerDefaultServing =
    pricePerGram !== null && defaultServingGrams ? pricePerGram * defaultServingGrams : null;

  function handleConfirm() {
    onConfirm({
      name: name.trim(),
      servings: buildServingInputs(servings),
      macros: {
        calories_kcal: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
        fiber_g: Number(fiber) || 0,
        sugar_g: Number(sugar) || 0,
      },
      price: {
        amount: Number(priceAmount) || 0,
        currency: priceCurrency.trim() || "USD",
      },
      source_url: sourceUrl.trim() || null,
    });
  }

  const canConfirm = name.trim() && servings.some((s) => labelForDraft(s, servings));

  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-xl p-6">
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
            Link (optional)
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className="field mt-1"
              placeholder="https://…"
            />
          </label>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Fiber (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={fiber}
                onChange={(event) => setFiber(event.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-sm font-medium text-[var(--color-fg-muted)]">
              Sugar (g)
              <input
                type="number"
                min="0"
                step="0.1"
                value={sugar}
                onChange={(event) => setSugar(event.target.value)}
                className="field mt-1"
              />
            </label>
          </div>
          <p className="-mt-2 text-xs text-[var(--color-fg-faint)]">
            Per {(defaultServing && labelForDraft(defaultServing, servings)) || "the unit marked below"}. Fiber
            and sugar default to 0 if you leave them blank — fill them in when you have them.
          </p>

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

          <div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">Servings &amp; units</h3>
            <div className="mt-2">
              <ServingsEditor servings={servings} onChange={setServings} idPrefix="confirm-dialog" />
            </div>

            {pricePerGram !== null ? (
              <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                ≈ {priceCurrency.trim() || "USD"} {pricePerGram.toFixed(4)} per gram
                {pricePerDefaultServing !== null ? (
                  <>
                    {" "}
                    · {priceCurrency.trim() || "USD"} {pricePerDefaultServing.toFixed(2)} per{" "}
                    {(defaultServing && labelForDraft(defaultServing, servings)) || "serving"}
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--color-fg-faint)]">
                Add a gram value to the price&rsquo;s unit to see cost-per-gram.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy || !canConfirm} className="btn btn-primary">
            {busy ? "Saving…" : "Add ingredient"}
          </button>
        </div>
      </div>
    </div>
  );
}
