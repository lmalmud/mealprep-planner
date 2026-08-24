"use client";

import { parseServingUnit } from "@/lib/units";
import type { IngredientServingInput } from "@/types/ingredient";

export type MassUnitType = "g" | "kg" | "oz" | "lb";
export type UnitType = MassUnitType | "custom" | "multiple";

export type ServingDraft = {
  unitType: UnitType;
  // Used when unitType is a mass unit: the number that goes with it (e.g. "2" for "2kg").
  amount: string;
  // Used when unitType is "custom": the food-specific name (e.g. "1 medium apple").
  // Used when unitType is "multiple": an optional override name — blank falls back to
  // an auto-generated one like "5 x 1 banana".
  customLabel: string;
  // Used when unitType is "custom": the manually-entered gram equivalent.
  grams: string;
  // Used when unitType is "multiple": how many of the base unit (e.g. "5").
  multipleCount: string;
  // Used when unitType is "multiple": index into the servings array of the unit being multiplied.
  multipleOfIndex: number | null;
  isDefault: boolean;
  isPriceServing: boolean;
};

const MASS_UNIT_OPTIONS: { key: MassUnitType; label: string; gramsPerUnit: number }[] = [
  { key: "g", label: "Grams (g)", gramsPerUnit: 1 },
  { key: "kg", label: "Kilograms (kg)", gramsPerUnit: 1000 },
  { key: "oz", label: "Ounces (oz)", gramsPerUnit: 28.3495 },
  { key: "lb", label: "Pounds (lb)", gramsPerUnit: 453.592 },
];

const MASS_UNIT_SYNONYMS: Record<string, MassUnitType> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
};

function gramsPerMassUnitType(unitType: MassUnitType): number {
  return MASS_UNIT_OPTIONS.find((option) => option.key === unitType)!.gramsPerUnit;
}

// Turns a saved serving's free-text label back into a structured draft: if
// it's a recognized weight (e.g. "154g", "2 lb"), it becomes an editable
// mass-unit row; otherwise it becomes a "custom food unit" row, since that's
// what it must have been to begin with. (A previously-saved "N x other unit"
// label — e.g. from a migration — also comes back as a plain custom row
// rather than a re-linked "multiple", since the link itself wasn't stored.)
export function draftFromServing(label: string, grams: number | null, isDefault: boolean, isPriceServing: boolean): ServingDraft {
  const parsed = parseServingUnit(label);
  const massUnitType = parsed ? MASS_UNIT_SYNONYMS[parsed.unit.trim().toLowerCase()] : undefined;
  if (parsed && massUnitType) {
    return {
      unitType: massUnitType,
      amount: String(parsed.amount),
      customLabel: "",
      grams: "",
      multipleCount: "1",
      multipleOfIndex: null,
      isDefault,
      isPriceServing,
    };
  }
  return {
    unitType: "custom",
    amount: "1",
    customLabel: label,
    grams: grams != null ? String(grams) : "",
    multipleCount: "1",
    multipleOfIndex: null,
    isDefault,
    isPriceServing,
  };
}

export function newServingDraft(): ServingDraft {
  return {
    unitType: "custom",
    amount: "1",
    customLabel: "",
    grams: "",
    multipleCount: "1",
    multipleOfIndex: null,
    isDefault: false,
    isPriceServing: false,
  };
}

// A base unit eligible to be multiplied — anything except another
// "multiple" row, so links can't chain into a cycle.
function eligibleBaseIndexes(servings: ServingDraft[], skipIndex: number): number[] {
  return servings.map((_, i) => i).filter((i) => i !== skipIndex && servings[i].unitType !== "multiple");
}

export function labelForDraft(draft: ServingDraft, allServings: ServingDraft[]): string {
  if (draft.unitType === "custom") return draft.customLabel.trim();
  if (draft.unitType === "multiple") {
    if (draft.customLabel.trim()) return draft.customLabel.trim();
    const base = draft.multipleOfIndex != null ? allServings[draft.multipleOfIndex] : undefined;
    const count = draft.multipleCount.trim() || "0";
    return base ? `${count} x ${labelForDraft(base, allServings)}` : `${count} x ?`;
  }
  return `${draft.amount.trim() || "0"}${draft.unitType}`;
}

// Rounds to the nearest tenth of a gram — unit-conversion math otherwise
// produces long floating-point tails (e.g. "5.4321000000000004") that are
// meaningless at food-serving precision.
function roundGrams(grams: number): number {
  return Math.round(grams * 10) / 10;
}

export function gramsForDraft(draft: ServingDraft, allServings: ServingDraft[]): number | null {
  if (draft.unitType === "custom") {
    const grams = Number(draft.grams);
    return draft.grams.trim() && Number.isFinite(grams) && grams > 0 ? roundGrams(grams) : null;
  }
  if (draft.unitType === "multiple") {
    const count = Number(draft.multipleCount);
    if (!Number.isFinite(count) || count <= 0) return null;
    const base = draft.multipleOfIndex != null ? allServings[draft.multipleOfIndex] : undefined;
    if (!base) return null;
    const baseGrams = gramsForDraft(base, allServings);
    return baseGrams != null ? roundGrams(count * baseGrams) : null;
  }
  const amount = Number(draft.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return roundGrams(amount * gramsPerMassUnitType(draft.unitType));
}

export function servingInputFromDraft(draft: ServingDraft, allServings: ServingDraft[]): IngredientServingInput {
  return {
    label: labelForDraft(draft, allServings),
    grams: gramsForDraft(draft, allServings),
    is_default: draft.isDefault,
    is_price_serving: draft.isPriceServing,
  };
}

// Converts a full draft list into the payload the API expects, dropping any
// row that never got a label. Grams/labels are resolved against the full
// list first (so "multiple of" links still point at the right row) and only
// filtered afterward.
export function buildServingInputs(servings: ServingDraft[]): IngredientServingInput[] {
  return servings.map((s) => servingInputFromDraft(s, servings)).filter((input) => input.label.trim().length > 0);
}

type ServingsEditorProps = {
  servings: ServingDraft[];
  onChange: (servings: ServingDraft[]) => void;
  idPrefix: string;
};

export default function ServingsEditor({ servings, onChange, idPrefix }: ServingsEditorProps) {
  function updateRow(index: number, patch: Partial<ServingDraft>) {
    onChange(servings.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function changeUnitType(index: number, unitType: UnitType) {
    onChange(
      servings.map((s, i) => {
        if (i !== index) return s;
        if (unitType === "multiple") {
          const bases = eligibleBaseIndexes(servings, index);
          return { ...s, unitType, multipleCount: s.multipleCount || "1", multipleOfIndex: bases[0] ?? null };
        }
        if (unitType === "custom") {
          const grams = gramsForDraft(s, servings);
          return { ...s, unitType, customLabel: s.customLabel || labelForDraft(s, servings), grams: grams != null ? String(grams) : s.grams };
        }
        const currentGrams = gramsForDraft(s, servings);
        const perUnit = gramsPerMassUnitType(unitType);
        const amount = currentGrams != null ? String(Number((currentGrams / perUnit).toFixed(4))) : s.amount || "1";
        return { ...s, unitType, amount };
      })
    );
  }

  function addRow() {
    onChange([...servings, newServingDraft()]);
  }

  function removeRow(index: number) {
    const next = servings
      .filter((_, i) => i !== index)
      .map((s) => {
        if (s.unitType !== "multiple" || s.multipleOfIndex === null) return s;
        if (s.multipleOfIndex === index) return { ...s, multipleOfIndex: null };
        if (s.multipleOfIndex > index) return { ...s, multipleOfIndex: s.multipleOfIndex - 1 };
        return s;
      });
    if (!next.length) return;
    if (!next.some((s) => s.isDefault)) next[0] = { ...next[0], isDefault: true };
    if (!next.some((s) => s.isPriceServing)) next[0] = { ...next[0], isPriceServing: true };
    onChange(next);
  }

  function setDefaultIndex(index: number) {
    onChange(servings.map((s, i) => ({ ...s, isDefault: i === index })));
  }

  function setPriceIndex(index: number) {
    onChange(servings.map((s, i) => ({ ...s, isPriceServing: i === index })));
  }

  const defaultIndex = servings.findIndex((s) => s.isDefault);
  const priceIndex = servings.findIndex((s) => s.isPriceServing);

  return (
    <div>
      <p className="text-xs leading-relaxed text-[var(--color-fg-faint)]">
        Add every way you buy or measure this food. A <strong>weight</strong> (154g) converts
        automatically. A <strong>specific food unit</strong> (1 medium apple) needs its gram weight
        entered by hand, once — then a <strong>multiple of another unit</strong> (5 bananas, if you&rsquo;ve
        already added &ldquo;1 banana&rdquo;) does the multiplication for you, which is handy when the
        price you have is for a pack rather than a single item.
      </p>

      <div className="mt-2 space-y-2">
        {servings.map((serving, index) => {
          const grams = gramsForDraft(serving, servings);
          const bases = eligibleBaseIndexes(servings, index);
          return (
            <div key={index} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={serving.unitType}
                  onChange={(event) => changeUnitType(index, event.target.value as UnitType)}
                  className="field field-sm w-auto"
                >
                  {MASS_UNIT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                  <option value="custom">Specific food unit (e.g. 1 medium apple)</option>
                  {bases.length > 0 ? (
                    <option value="multiple">Multiple of another unit (e.g. 5 bananas)</option>
                  ) : null}
                </select>

                {serving.unitType === "custom" ? (
                  <>
                    <input
                      value={serving.customLabel}
                      onChange={(event) => updateRow(index, { customLabel: event.target.value })}
                      className="field field-sm w-40"
                      placeholder="e.g. 1 medium apple"
                    />
                    <span className="text-xs text-[var(--color-fg-faint)]">=</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={serving.grams}
                      onChange={(event) => updateRow(index, { grams: event.target.value })}
                      className="field field-sm w-20"
                      placeholder="grams"
                    />
                    <span className="text-xs text-[var(--color-fg-faint)]">g</span>
                  </>
                ) : serving.unitType === "multiple" ? (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={serving.multipleCount}
                      onChange={(event) => updateRow(index, { multipleCount: event.target.value })}
                      className="field field-sm w-16"
                    />
                    <span className="text-xs text-[var(--color-fg-faint)]">x</span>
                    <select
                      value={serving.multipleOfIndex ?? ""}
                      onChange={(event) => updateRow(index, { multipleOfIndex: Number(event.target.value) })}
                      className="field field-sm w-auto"
                    >
                      {bases.map((baseIndex) => (
                        <option key={baseIndex} value={baseIndex}>
                          {labelForDraft(servings[baseIndex], servings) || `Unit ${baseIndex + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-[var(--color-fg-faint)]">
                      {grams !== null ? `= ${grams.toLocaleString(undefined, { maximumFractionDigits: 1 })}g` : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={serving.amount}
                      onChange={(event) => updateRow(index, { amount: event.target.value })}
                      className="field field-sm w-20"
                    />
                    <span className="text-xs text-[var(--color-fg-faint)]">
                      {grams !== null ? `= ${grams.toLocaleString(undefined, { maximumFractionDigits: 1 })}g` : ""}
                    </span>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={servings.length <= 1}
                  className="btn btn-danger btn-sm ml-auto"
                >
                  Remove
                </button>
              </div>

              {serving.unitType === "multiple" ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-[var(--color-fg-faint)]">
                    Name it (optional):
                    <input
                      value={serving.customLabel}
                      onChange={(event) => updateRow(index, { customLabel: event.target.value })}
                      className="field field-sm ml-1 w-40"
                      placeholder={labelForDraft({ ...serving, customLabel: "" }, servings)}
                    />
                  </label>
                </div>
              ) : null}

              {serving.unitType === "custom" && !serving.grams.trim() ? (
                <p className="mt-1 text-xs" style={{ color: "var(--color-warning)" }}>
                  No gram value yet — this unit can&rsquo;t convert to/from the others until you add one.
                </p>
              ) : null}
              {serving.unitType === "multiple" && grams === null ? (
                <p className="mt-1 text-xs" style={{ color: "var(--color-warning)" }}>
                  Enter a count and pick a unit above to compute its gram weight.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addRow} className="btn btn-secondary btn-sm mt-2">
        Add another unit
      </button>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-[var(--color-fg-muted)]">
          Nutrition facts above are for
          <select
            value={defaultIndex >= 0 ? defaultIndex : 0}
            onChange={(event) => setDefaultIndex(Number(event.target.value))}
            className="field field-sm mt-1"
            id={`${idPrefix}-default-serving`}
          >
            {servings.map((serving, index) => (
              <option key={index} value={index}>
                {labelForDraft(serving, servings) || `Unit ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-[var(--color-fg-muted)]">
          Price above is for
          <select
            value={priceIndex >= 0 ? priceIndex : 0}
            onChange={(event) => setPriceIndex(Number(event.target.value))}
            className="field field-sm mt-1"
            id={`${idPrefix}-price-serving`}
          >
            {servings.map((serving, index) => (
              <option key={index} value={index}>
                {labelForDraft(serving, servings) || `Unit ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
