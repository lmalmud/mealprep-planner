import { useState } from "react";
import { createIngredient, searchIngredient, searchIngredientByUrl } from "@/services/ingredients";
import type { Ingredient, IngredientInput } from "@/types/ingredient";

type UseIngredientSearchOptions = {
  onAdded: (ingredient: Ingredient) => void;
};

export function useIngredientSearch({ onAdded }: UseIngredientSearchOptions) {
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pendingCandidate, setPendingCandidate] = useState<IngredientInput | null>(null);

  async function search(query: string) {
    const trimmed = query.trim();
    setFeedback("");

    if (!trimmed) {
      setFeedback("Please type an ingredient name.");
      return;
    }

    try {
      setSearching(true);
      const result = await searchIngredient(trimmed);
      if (result.status === "existing") {
        onAdded(result.ingredient);
        setFeedback(`Added "${result.ingredient.name}" to your ingredients.`);
      } else {
        setPendingCandidate(result.candidate);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to find that ingredient. Try another search.");
    } finally {
      setSearching(false);
    }
  }

  async function searchByUrl(url: string) {
    const trimmed = url.trim();
    setFeedback("");

    if (!trimmed) {
      setFeedback("Please paste a product URL.");
      return;
    }

    try {
      setSearching(true);
      const result = await searchIngredientByUrl(trimmed);
      if (result.status === "existing") {
        onAdded(result.ingredient);
        setFeedback(`Added "${result.ingredient.name}" to your ingredients.`);
      } else {
        setPendingCandidate(result.candidate);
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to extract product info from that URL."
      );
    } finally {
      setSearching(false);
    }
  }

  async function confirmCandidate(edited: IngredientInput) {
    try {
      setCreating(true);
      const created = await createIngredient(edited);
      onAdded(created);
      setPendingCandidate(null);
      setFeedback(`Added "${created.name}" to your ingredients.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save that ingredient.");
    } finally {
      setCreating(false);
    }
  }

  function cancelCandidate() {
    setPendingCandidate(null);
  }

  return {
    pendingCandidate,
    searching,
    creating,
    feedback,
    search,
    searchByUrl,
    confirmCandidate,
    cancelCandidate,
  };
}
