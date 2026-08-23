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
