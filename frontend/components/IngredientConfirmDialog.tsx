"use client";

import { useState } from "react";
import { parseMassGrams } from "@/lib/units";
import type { IngredientInput, IngredientServingInput } from "@/types/ingredient";

type ServingDraft = {
  label: string;
  grams: string;
  isDefault: boolean;
  isPriceServing: boolean;
};

function toServingDrafts(servings: IngredientServingInput[]): ServingDraft[] {
  return servings.map((s) => ({
    label: s.label,
    grams: s.grams != null ? String(s.grams) : "",
    isDefault: s.is_default,
    isPriceServing: s.is_price_serving,
  }));
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
  const [calories, setCalories] = useState(String(candidate.macros.calories_kcal));
  const [protein, setProtein] = useState(String(candidate.macros.protein_g));
  const [carbs, setCarbs] = useState(String(candidate.macros.carbs_g));
  const [fat, setFat] = useState(String(candidate.macros.fat_g));
  const [priceAmount, setPriceAmount] = useState(String(candidate.price.amount));
  const [priceCurrency, setPriceCurrency] = useState(candidate.price.currency);
  const [servings, setServings] = useState<ServingDraft[]>(
    toServingDrafts(candidate.servings.length ? candidate.servings : [{ label: "100g", grams: 100, is_default: true, is_price_serving: true }])
  );

  const defaultServing = servings.find((s) => s.isDefault) ?? servings[0];
  const priceServing = servings.find((s) => s.isPriceServing) ?? defaultServing;
  const priceServingGrams = priceServing ? Number(priceServing.grams) || null : null;
  const defaultServingGrams = defaultServing ? Number(defaultServing.grams) || null : null;
  const pricePerGram = priceServingGrams ? (Number(priceAmount) || 0) / priceServingGrams : null;
  const pricePerDefaultServing =
    pricePerGram !== null && defaultServingGrams ? pricePerGram * defaultServingGrams : null;

  function updateServing(index: number, patch: Partial<ServingDraft>) {
    setServings((previous) => previous.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function updateServingLabel(index: number, label: string) {
    setServings((previous) =>
      previous.map((s, i) => {
        if (i !== index) return s;
        // Auto-fill grams from the label when it's a recognized mass unit
        // (e.g. typing "250g") and the user hasn't set a custom value yet.
        const autoGrams = parseMassGrams(label);
        const shouldAutoFill = autoGrams !== null && (s.grams === "" || parseMassGrams(s.label) === Number(s.grams));
        return { ...s, label, grams: shouldAutoFill ? String(autoGrams) : s.grams };
      })
    );
  }

  function setAsDefault(index: number) {
    setServings((previous) => previous.map((s, i) => ({ ...s, isDefault: i === index })));
  }

  function setAsPriceServing(index: number) {
    setServings((previous) => previous.map((s, i) => ({ ...s, isPriceServing: i === index })));
  }

  function addServing() {
    setServings((previous) => [...previous, { label: "", grams: "", isDefault: false, isPriceServing: false }]);
  }

  function removeServing(index: number) {
    setServings((previous) => {
      const next = previous.filter((_, i) => i !== index);
      if (!next.length) return next;
      if (!next.some((s) => s.isDefault)) next[0] = { ...next[0], isDefault: true };
      if (!next.some((s) => s.isPriceServing)) next[0] = { ...next[0], isPriceServing: true };
      return next;
    });
  }

  function handleConfirm() {
    onConfirm({
      name: name.trim(),
      servings: servings
        .filter((s) => s.label.trim())
        .map((s) => ({
          label: s.label.trim(),
          grams: s.grams.trim() ? Number(s.grams) : null,
          is_default: s.isDefault,
          is_price_serving: s.isPriceServing,
        })),
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

  const canConfirm = name.trim() && servings.some((s) => s.label.trim());

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
          <p className="-mt-2 text-xs text-[var(--color-fg-faint)]">
            Per {defaultServing?.label.trim() || "the default serving below"}.
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">Servings &amp; units</h3>
              <button type="button" onClick={addServing} className="btn btn-secondary btn-sm">
                Add a unit
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-faint)]">
              Add every way you might want to measure this ingredient (e.g. &quot;100g&quot;, &quot;1 medium
              apple&quot;, &quot;2lb pack&quot;) with its gram equivalent — mass units like g/kg/oz/lb
              fill in automatically. Pick which one macros are &quot;per&quot;, and which one the price is
              for; everything converts between units that have a gram value.
            </p>

            <div className="mt-3 space-y-2">
              {servings.map((serving, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[2fr_1fr_auto_auto_auto] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2"
                >
                  <input
                    value={serving.label}
                    onChange={(event) => updateServingLabel(index, event.target.value)}
                    className="field field-sm"
                    placeholder="e.g. 1 medium apple"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={serving.grams}
                    onChange={(event) => updateServing(index, { grams: event.target.value })}
                    className="field field-sm"
                    placeholder="grams"
                  />
                  <label className="flex items-center gap-1 text-xs text-[var(--color-fg-muted)]">
                    <input type="radio" name="default-serving" checked={serving.isDefault} onChange={() => setAsDefault(index)} />
                    Macros
                  </label>
                  <label className="flex items-center gap-1 text-xs text-[var(--color-fg-muted)]">
                    <input
                      type="radio"
                      name="price-serving"
                      checked={serving.isPriceServing}
                      onChange={() => setAsPriceServing(index)}
                    />
                    Price
                  </label>
                  <button
                    type="button"
                    onClick={() => removeServing(index)}
                    disabled={servings.length <= 1}
                    className="btn btn-danger btn-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {pricePerGram !== null ? (
              <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                ≈ {priceCurrency.trim() || "USD"} {pricePerGram.toFixed(4)} per gram
                {pricePerDefaultServing !== null ? (
                  <>
                    {" "}
                    · {priceCurrency.trim() || "USD"} {pricePerDefaultServing.toFixed(2)} per{" "}
                    {defaultServing?.label.trim() || "serving"}
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
