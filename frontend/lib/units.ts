export type ParsedUnit = {
  amount: number;
  unit: string;
};

// Splits a free-text serving unit like "170g" or "1.5 cup" into a numeric
// amount and the trailing unit text. Returns null when no leading number is
// present (e.g. "1 package" with no clear per-item weight).
export function parseServingUnit(servingUnit: string): ParsedUnit | null {
  const match = servingUnit.trim().match(/^([\d.]+)\s*(.*)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = match[2].trim() || "g";
  return { amount, unit };
}

// Grams-per-unit for recognized mass units — mirrors
// backend/app/services/mass_units.py exactly, so client-side previews (e.g.
// auto-filling a serving's grams as you type its label) match what the
// server will compute.
const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  mg: 0.001,
  milligram: 0.001,
  milligrams: 0.001,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

export function gramsPerMassUnit(unit: string): number | null {
  return GRAMS_PER_UNIT[unit.trim().toLowerCase()] ?? null;
}

// Parses free text like "154g" or "2lb" into a gram value. Returns null if
// there's no leading number or the unit isn't a recognized mass unit (e.g.
// "0.66cup", "1 package") — those need a manually-entered gram value.
export function parseMassGrams(text: string): number | null {
  const parsed = parseServingUnit(text);
  if (!parsed) return null;
  const gramsPerUnit = gramsPerMassUnit(parsed.unit);
  return gramsPerUnit === null ? null : parsed.amount * gramsPerUnit;
}

// Resolves a meal-ingredient quantity (amount + free-text unit) into grams,
// mirroring backend/app/services/meal_service.py's `_grams_for_quantity`
// exactly: a bare recognized mass unit (g/kg/oz/lb/...) always converts
// exactly; otherwise the unit text is matched against one of the
// ingredient's own named servings. Returns null if neither resolves.
export function gramsForQuantity(
  quantityAmount: number,
  quantityUnit: string,
  servings: { label: string; grams: number | null }[]
): number | null {
  const gramsPerUnit = gramsPerMassUnit(quantityUnit);
  if (gramsPerUnit !== null) return quantityAmount * gramsPerUnit;

  const normalized = quantityUnit.trim().toLowerCase();
  const matched = servings.find((s) => s.grams !== null && s.label.trim().toLowerCase() === normalized);
  return matched?.grams != null ? quantityAmount * matched.grams : null;
}
