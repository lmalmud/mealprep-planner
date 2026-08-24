"use client";

import type { GroceryListItem } from "@/types/meal";

type GroceryListViewProps = {
  planName: string;
  items: GroceryListItem[];
  onClose: () => void;
};

export default function GroceryListView({ planName, items, onClose }: GroceryListViewProps) {
  const currency = items.find((item) => item.currency)?.currency ?? "USD";
  const totalCost = items.reduce((sum, item) => sum + (item.estimated_cost ?? 0), 0);
  const hasIncompleteCost = items.some((item) => item.estimated_cost === null);

  return (
    <div className="modal-overlay">
      <div className="modal-panel w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Grocery list — {planName}</h2>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>

        {items.length ? (
          <div className="mt-4 max-h-96 overflow-y-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-fg-faint)]">
                  <th className="py-2 pr-3 font-medium">Ingredient</th>
                  <th className="py-2 pr-3 font-medium">Needed</th>
                  <th className="py-2 pr-3 font-medium">Buy</th>
                  <th className="py-2 pr-3 font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.ingredient_id} className="border-b border-[var(--color-border)] align-top last:border-b-0">
                    <td className="py-2 pr-3 font-medium text-[var(--color-fg)]">{item.ingredient_name}</td>
                    <td className="py-2 pr-3 text-[var(--color-fg-muted)]">
                      {Number(item.total_amount.toFixed(1))}
                      {item.total_unit}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-fg-muted)]">
                      {item.containers_needed !== null ? (
                        `${item.containers_needed}×`
                      ) : (
                        <span className="text-[var(--color-fg-faint)]">—</span>
                      )}
                      {item.note ? (
                        <div className="mt-1 text-xs text-[var(--color-warning)]">{item.note}</div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-fg-muted)]">
                      {item.estimated_cost !== null ? (
                        `${item.currency ?? currency} ${item.estimated_cost.toFixed(2)}`
                      ) : (
                        <span className="text-[var(--color-fg-faint)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm font-medium text-[var(--color-fg)]">
              Estimated total: {currency} {totalCost.toFixed(2)}
              {hasIncompleteCost ? "+" : ""}
            </p>
            {hasIncompleteCost ? (
              <p className="mt-1 text-xs text-[var(--color-fg-faint)]">
                Some items couldn&rsquo;t be estimated (see notes above) and aren&rsquo;t included in the total.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
            This plan doesn&rsquo;t have any meals assigned yet.
          </p>
        )}
      </div>
    </div>
  );
}
