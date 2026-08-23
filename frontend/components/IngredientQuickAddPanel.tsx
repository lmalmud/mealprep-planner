"use client";

import { useState } from "react";

type IngredientQuickAddPanelProps = {
  search: (query: string) => Promise<void>;
  searchByUrl: (url: string) => Promise<void>;
  searching: boolean;
  feedback: string;
};

export default function IngredientQuickAddPanel({
  search,
  searchByUrl,
  searching,
  feedback,
}: IngredientQuickAddPanelProps) {
  const [mode, setMode] = useState<"name" | "url">("name");
  const [nameQuery, setNameQuery] = useState("");
  const [urlQuery, setUrlQuery] = useState("");

  async function handleNameSubmit() {
    const query = nameQuery;
    setNameQuery("");
    await search(query);
  }

  async function handleUrlSubmit() {
    const url = urlQuery;
    setUrlQuery("");
    await searchByUrl(url);
  }

  return (
    <div className="surface-panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-fg)]">Add an ingredient</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode("name")}
            className={`btn btn-sm ${mode === "name" ? "btn-primary" : "btn-secondary"}`}
          >
            Search by name
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`btn btn-sm ${mode === "url" ? "btn-primary" : "btn-secondary"}`}
          >
            Paste a link
          </button>
        </div>
      </div>

      {mode === "name" ? (
        <>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-muted)]">
            Search the nutrient database by name. Existing ingredients are added instantly; new ones
            ask you to review the values (especially price) before saving.
          </p>
          <div className="mt-3 flex gap-3">
            <input
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleNameSubmit();
                }
              }}
              className="field flex-1"
              placeholder="e.g. apple, salmon, oats"
            />
            <button type="button" onClick={handleNameSubmit} disabled={searching} className="btn btn-primary">
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-muted)]">
            Paste a link to a specific product (e.g. a brand you buy) to prefill its name and price.
            Works best on sites that publish structured product data — results may be partial or
            unavailable depending on the site. Nutrition still comes from a name-based database search,
            and you can always fill in or correct anything before saving.
          </p>
          <div className="mt-3 flex gap-3">
            <input
              value={urlQuery}
              onChange={(event) => setUrlQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleUrlSubmit();
                }
              }}
              type="url"
              className="field flex-1"
              placeholder="https://example.com/products/..."
            />
            <button type="button" onClick={handleUrlSubmit} disabled={searching} className="btn btn-primary">
              {searching ? "Extracting…" : "Extract"}
            </button>
          </div>
        </>
      )}

      {feedback ? <p className="mt-2 text-xs text-[var(--color-fg-muted)]">{feedback}</p> : null}
    </div>
  );
}
