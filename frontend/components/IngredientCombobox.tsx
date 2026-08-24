"use client";

import { useEffect, useRef, useState } from "react";
import type { Ingredient } from "@/types/ingredient";

type IngredientComboboxProps = {
  ingredients: Ingredient[];
  value: string;
  onSelect: (ingredient: Ingredient) => void;
  onRequestAdd: (query: string) => void;
  disabled?: boolean;
};

export default function IngredientCombobox({
  ingredients,
  value,
  onSelect,
  onRequestAdd,
  disabled = false,
}: IngredientComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = ingredients.find((ingredient) => String(ingredient.id) === value);
    setQuery(selected?.name ?? "");
  }, [value, ingredients]);

  const trimmedQuery = query.trim();
  const matches = trimmedQuery
    ? ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : ingredients;
  const hasExactMatch = ingredients.some(
    (ingredient) => ingredient.name.toLowerCase() === trimmedQuery.toLowerCase()
  );

  function handleSelect(ingredient: Ingredient) {
    onSelect(ingredient);
    setQuery(ingredient.name);
    setOpen(false);
  }

  function handleRequestAdd() {
    onRequestAdd(trimmedQuery);
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        className="field mt-1"
        placeholder="Type to search or add a food"
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card)]">
          {matches.map((ingredient) => (
            <button
              key={ingredient.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(ingredient)}
              className="block w-full px-3 py-2 text-left text-sm text-[var(--color-fg)] hover:bg-[var(--color-bg-subtle)]"
            >
              {ingredient.name}
            </button>
          ))}
          {trimmedQuery && !hasExactMatch ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleRequestAdd}
              className="block w-full border-t border-[var(--color-border)] px-3 py-2 text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-bg-subtle)]"
            >
              + Add &ldquo;{trimmedQuery}&rdquo; as a new ingredient
            </button>
          ) : null}
          {!matches.length && !trimmedQuery ? (
            <p className="px-3 py-2 text-sm text-[var(--color-fg-faint)]">No ingredients yet — type to add one.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
