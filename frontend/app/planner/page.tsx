"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { fetchIngredients } from "@/services/ingredients";
import { createMeal, createMealPlan, fetchMeals } from "@/services/planner";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import type { Ingredient } from "@/types/ingredient";
import type { Meal, MealCreatePayload, MealPlan, MealPlanAssignmentPayload, MealPlanCreatePayload } from "@/types/meal";
import NavBar from "@/components/NavBar";
import IngredientConfirmDialog from "@/components/IngredientConfirmDialog";
import IngredientQuickAddPanel from "@/components/IngredientQuickAddPanel";
import DraggableMealCard from "@/components/DraggableMealCard";
import CalendarDropCell from "@/components/CalendarDropCell";

type MealIngredientDraft = {
  ingredient_id: string;
  quantity_amount: string;
  quantity_unit: string;
};

const PLANNER_SLOTS = ["breakfast", "lunch", "dinner", "snack"];

export default function PlannerPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealName, setMealName] = useState("");
  const [mealDescription, setMealDescription] = useState("");
  const [mealIngredients, setMealIngredients] = useState<MealIngredientDraft[]>([
    { ingredient_id: "", quantity_amount: "", quantity_unit: "g" },
  ]);
  const [mealFeedback, setMealFeedback] = useState("");
  const [creatingMeal, setCreatingMeal] = useState(false);

  const {
    pendingCandidate,
    searching: searchingIngredient,
    creating: creatingIngredient,
    feedback: ingredientSearchFeedback,
    search: searchIngredient,
    searchByUrl: searchIngredientByUrl,
    confirmCandidate,
    cancelCandidate,
  } = useIngredientSearch({
    onAdded: (ingredient) => {
      setIngredients((previous) => {
        const exists = previous.some((ing) => ing.id === ingredient.id);
        return exists ? previous : [ingredient, ...previous];
      });
    },
  });

  const [planName, setPlanName] = useState("My 7-Day Plan");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState(7);
  const [assignments, setAssignments] = useState<MealPlanAssignmentPayload[]>([]);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planFeedback, setPlanFeedback] = useState("");
  const [createdPlan, setCreatedPlan] = useState<MealPlan | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [ingredientData, mealData] = await Promise.all([fetchIngredients(), fetchMeals()]);
        setIngredients(ingredientData);
        setMeals(mealData);
      } catch {
        setMealFeedback("Unable to load ingredients and meals right now.");
      }
    }

    void loadData();
  }, []);

  function computeMealTotals(meal: Meal) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, price: 0, priceIncomplete: false };
    for (const item of meal.ingredients) {
      const ing = ingredients.find((i) => i.id === item.ingredient_id);
      if (!ing) continue;
      // assume ingredient macros are per 100g of serving_unit; compute factor
      const factor = (Number(item.quantity_amount) || 0) / 100;
      totals.calories += (ing.macros.calories_kcal || 0) * factor;
      totals.protein += (ing.macros.protein_g || 0) * factor;
      totals.carbs += (ing.macros.carbs_g || 0) * factor;
      totals.fat += (ing.macros.fat_g || 0) * factor;

      // If the price is explicitly for a different quantity than serving_unit
      // (e.g. a whole package vs. a per-serving macro basis), scaling it by
      // the same factor as macros would be misleading — skip it and flag the
      // total as incomplete rather than showing a fabricated number.
      if (ing.price.unit && ing.price.unit !== ing.serving_unit) {
        totals.priceIncomplete = true;
      } else {
        totals.price += (ing.price.amount || 0) * factor;
      }
    }
    return totals;
  }

  useEffect(() => {
    const nextAssignments = Array.from({ length: Math.max(1, Number(durationDays) || 1) }, (_, dayIndex) =>
      PLANNER_SLOTS.map((slot) => ({
        day_index: dayIndex,
        slot,
        meal_id: 0,
      }))
    ).flat();

    setAssignments((previous) => {
      const existingByKey = new Map(previous.map((item) => [`${item.day_index}:${item.slot}`, item.meal_id]));
      return nextAssignments.map((assignment) => {
        const previousMealId = existingByKey.get(`${assignment.day_index}:${assignment.slot}`);
        return previousMealId ? { ...assignment, meal_id: previousMealId } : assignment;
      });
    });
  }, [durationDays]);

  function updateMealIngredient(index: number, field: keyof MealIngredientDraft, value: string) {
    setMealIngredients((previous) =>
      previous.map((ingredientEntry, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredientEntry, [field]: value } : ingredientEntry
      )
    );
  }

  function addMealIngredient() {
    setMealIngredients((previous) => [...previous, { ingredient_id: "", quantity_amount: "", quantity_unit: "g" }]);
  }

  function removeMealIngredient(index: number) {
    setMealIngredients((previous) => previous.filter((_, ingredientIndex) => ingredientIndex !== index));
  }

  async function handleCreateMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMealFeedback("");

    if (!mealName.trim()) {
      setMealFeedback("Please give the meal a name.");
      return;
    }

    const normalizedIngredients = mealIngredients
      .filter((entry) => entry.ingredient_id && entry.quantity_amount)
      .map((entry) => ({
        ingredient_id: Number(entry.ingredient_id),
        quantity_amount: Number(entry.quantity_amount),
        quantity_unit: entry.quantity_unit.trim() || "g",
      }));

    if (!normalizedIngredients.length) {
      setMealFeedback("Add at least one food and quantity.");
      return;
    }

    const payload: MealCreatePayload = {
      name: mealName.trim(),
      description: mealDescription.trim(),
      ingredients: normalizedIngredients,
    };

    try {
      setCreatingMeal(true);
      const createdMeal = await createMeal(payload);
      setMeals((previous) => [createdMeal, ...previous]);
      setMealName("");
      setMealDescription("");
      setMealIngredients([{ ingredient_id: "", quantity_amount: "", quantity_unit: "g" }]);
      setMealFeedback(`Created meal “${createdMeal.name}”.`);
    } catch (error) {
      setMealFeedback(error instanceof Error ? error.message : "Unable to create the meal.");
    } finally {
      setCreatingMeal(false);
    }
  }

  function renderMealSummary(meal: Meal) {
    const totals = computeMealTotals(meal);
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-muted)]">
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          Calories: {totals.calories.toFixed(0)}
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          Protein: {totals.protein.toFixed(1)}g
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          Carbs: {totals.carbs.toFixed(1)}g
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          Fat: {totals.fat.toFixed(1)}g
        </span>
        <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1">
          Price: {ingredients[0]?.price.currency ?? "USD"} {totals.price.toFixed(2)}
          {totals.priceIncomplete ? "+" : ""}
        </span>
        {totals.priceIncomplete ? (
          <span className="text-xs text-[var(--color-fg-faint)]">
            Some ingredients are priced per a different unit and aren&rsquo;t included above.
          </span>
        ) : null}
      </div>
    );
  }

  function updateAssignment(dayIndex: number, slot: string, mealId: number) {
    setAssignments((previous) =>
      previous.map((assignment) =>
        assignment.day_index === dayIndex && assignment.slot === slot
          ? { ...assignment, meal_id: mealId }
          : assignment
      )
    );
  }

  const [activeDragMealId, setActiveDragMealId] = useState<number | null>(null);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const mealId = (event.active.data.current as { mealId?: number } | undefined)?.mealId;
    setActiveDragMealId(mealId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragMealId(null);
    const { active, over } = event;
    if (!over) return;
    const mealId = (active.data.current as { mealId?: number } | undefined)?.mealId;
    const target = over.data.current as { dayIndex: number; slot: string } | undefined;
    if (!mealId || !target) return;
    updateAssignment(target.dayIndex, target.slot, mealId);
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanFeedback("");

    if (!planName.trim()) {
      setPlanFeedback("Please give the plan a name.");
      return;
    }

    const filledAssignments = assignments.filter((assignment) => assignment.meal_id > 0);
    if (!filledAssignments.length) {
      setPlanFeedback("Assign at least one meal to the calendar before saving your plan.");
      return;
    }

    const payload: MealPlanCreatePayload = {
      name: planName.trim(),
      start_date: startDate,
      duration_days: Math.max(1, Number(durationDays) || 1),
      assignments: filledAssignments,
    };

    try {
      setCreatingPlan(true);
      const createdPlan = await createMealPlan(payload);
      setCreatedPlan(createdPlan);
      setPlanFeedback(`Created plan “${createdPlan.name}”.`);
    } catch (error) {
      setPlanFeedback(error instanceof Error ? error.message : "Unable to create the meal plan.");
    } finally {
      setCreatingPlan(false);
    }
  }

  function getAssignmentMealId(dayIndex: number, slot: string) {
    return assignments.find((assignment) => assignment.day_index === dayIndex && assignment.slot === slot)?.meal_id ?? 0;
  }

  function computePlanTotals(plan: MealPlan | null) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, price: 0, priceIncomplete: false };
    if (!plan) return totals;
    for (const assignment of plan.assignments) {
      const meal = meals.find((m) => m.id === assignment.meal_id);
      if (!meal) continue;
      const t = computeMealTotals(meal);
      totals.calories += t.calories;
      totals.protein += t.protein;
      totals.carbs += t.carbs;
      totals.fat += t.fat;
      totals.price += t.price;
      totals.priceIncomplete = totals.priceIncomplete || t.priceIncomplete;
    }
    return totals;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <NavBar />
      <main className="px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--color-fg-faint)]">MealPrep Planner</p>
            <h1 className="mt-1 text-4xl">Build your meal plan</h1>
            <p className="mt-3 max-w-2xl text-[var(--color-fg-muted)]">
              Create reusable meals with specific foods and quantities, then place those meals into a time period such as a week.
            </p>
          </div>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>

        <section className="surface-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl">1. Create a meal</h2>
              <p className="mt-1 text-sm text-[var(--color-fg-muted)]">Add foods and quantities that can be reused in future plans.</p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleCreateMeal}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-[var(--color-fg-muted)]">
                Meal name
                <input
                  value={mealName}
                  onChange={(event) => setMealName(event.target.value)}
                  className="field mt-1"
                  placeholder="Chicken rice bowl"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--color-fg-muted)]">
                Description
                <input
                  value={mealDescription}
                  onChange={(event) => setMealDescription(event.target.value)}
                  className="field mt-1"
                  placeholder="Lunch for the week"
                />
              </label>
            </div>

            <div className="space-y-4">
              <IngredientQuickAddPanel
                search={searchIngredient}
                searchByUrl={searchIngredientByUrl}
                searching={searchingIngredient}
                feedback={ingredientSearchFeedback}
              />

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-fg)]">Foods in this meal</h3>
                <button type="button" onClick={addMealIngredient} className="btn btn-secondary btn-sm">
                  Add food
                </button>
              </div>

              {mealIngredients.map((ingredientEntry, index) => (
                <div
                  key={`${ingredientEntry.ingredient_id}-${index}`}
                  className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 md:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <label className="text-sm font-medium text-[var(--color-fg-muted)]">
                    Food
                    <select
                      value={ingredientEntry.ingredient_id}
                      onChange={(event) => updateMealIngredient(index, "ingredient_id", event.target.value)}
                      className="field mt-1"
                    >
                      <option value="">Select an ingredient</option>
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-[var(--color-fg-muted)]">
                    Quantity
                    <input
                      value={ingredientEntry.quantity_amount}
                      onChange={(event) => updateMealIngredient(index, "quantity_amount", event.target.value)}
                      className="field mt-1"
                      placeholder="200"
                      type="number"
                      min="0"
                      step="0.1"
                    />
                  </label>

                  <label className="text-sm font-medium text-[var(--color-fg-muted)]">
                    Unit
                    <input
                      value={ingredientEntry.quantity_unit}
                      onChange={(event) => updateMealIngredient(index, "quantity_unit", event.target.value)}
                      className="field mt-1"
                      placeholder="g"
                    />
                  </label>

                  <button type="button" onClick={() => removeMealIngredient(index)} className="btn btn-danger self-end">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={creatingMeal} className="btn btn-primary">
                {creatingMeal ? "Creating…" : "Save meal"}
              </button>
              {mealFeedback ? <p className="text-sm text-[var(--color-fg-muted)]">{mealFeedback}</p> : null}
            </div>
          </form>
        </section>

        <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <section className="surface-card p-6">
            <h3 className="text-xl">Saved meals</h3>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Drag a meal onto the calendar below to assign it, or use the dropdown in each cell.
            </p>
            <div className="mt-4 grid gap-3">
              {meals.length ? (
                meals.map((meal) => (
                  <DraggableMealCard key={meal.id} meal={meal}>
                    <div className="font-medium text-[var(--color-fg)]">{meal.name}</div>
                    <div className="text-sm text-[var(--color-fg-muted)]">{meal.description}</div>
                    {renderMealSummary(meal)}
                  </DraggableMealCard>
                ))
              ) : (
                <div className="text-sm text-[var(--color-fg-faint)]">No saved meals yet.</div>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl">2. Create a time period plan</h2>
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  Choose how many days you want to plan for and assign meals to each day and slot.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleCreatePlan}>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-[var(--color-fg-muted)]">
                  Plan name
                  <input
                    value={planName}
                    onChange={(event) => setPlanName(event.target.value)}
                    className="field mt-1"
                    placeholder="Week 1"
                  />
                </label>
                <label className="text-sm font-medium text-[var(--color-fg-muted)]">
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="field mt-1"
                  />
                </label>
                <label className="text-sm font-medium text-[var(--color-fg-muted)]">
                  Days in plan
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(event) => setDurationDays(Number(event.target.value))}
                    className="field mt-1"
                  />
                </label>
              </div>

              <div className="surface-card overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-fg-faint)]">
                      <th className="px-3 py-3 text-left font-medium">Day</th>
                      {PLANNER_SLOTS.map((slot) => (
                        <th key={slot} className="px-3 py-3 text-left font-medium capitalize">
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(1, Number(durationDays) || 1) }, (_, dayIndex) => (
                      <tr key={dayIndex} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="px-3 py-3 font-medium text-[var(--color-fg)]">Day {dayIndex + 1}</td>
                        {PLANNER_SLOTS.map((slot) => (
                          <CalendarDropCell key={`${dayIndex}-${slot}`} dayIndex={dayIndex} slot={slot}>
                            <select
                              value={getAssignmentMealId(dayIndex, slot)}
                              onChange={(event) => updateAssignment(dayIndex, slot, Number(event.target.value))}
                              className="field field-sm"
                            >
                              <option value="0">Select a meal</option>
                              {meals.map((meal) => (
                                <option key={meal.id} value={meal.id}>
                                  {meal.name}
                                </option>
                              ))}
                            </select>
                          </CalendarDropCell>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={creatingPlan} className="btn btn-primary">
                  {creatingPlan ? "Creating…" : "Save plan"}
                </button>
                {planFeedback ? <p className="text-sm text-[var(--color-fg-muted)]">{planFeedback}</p> : null}
              </div>
            </form>
          </section>

          <DragOverlay>
            {activeDragMealId ? (
              <div className="surface-card px-3 py-2 shadow-[var(--shadow-modal)]">
                {meals.find((m) => m.id === activeDragMealId)?.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <section className="surface-card p-6">
          <h2 className="text-2xl">3. Review your complete time period</h2>
          {createdPlan ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--color-fg-muted)]">
                {createdPlan.name} starts on {createdPlan.start_date} for {createdPlan.duration_days} day(s).
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const pt = computePlanTotals(createdPlan);
                  return (
                    <>
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-sm">
                        Week Calories: {pt.calories.toFixed(0)}
                      </span>
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-sm">
                        Protein: {pt.protein.toFixed(1)}g
                      </span>
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-sm">
                        Carbs: {pt.carbs.toFixed(1)}g
                      </span>
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-sm">
                        Fat: {pt.fat.toFixed(1)}g
                      </span>
                      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-sm">
                        Estimated Cost: {ingredients[0]?.price.currency ?? "USD"} {pt.price.toFixed(2)}
                        {pt.priceIncomplete ? "+" : ""}
                      </span>
                      {pt.priceIncomplete ? (
                        <span className="flex items-center text-xs text-[var(--color-fg-faint)]">
                          Some ingredients are priced per a different unit and aren&rsquo;t included above.
                        </span>
                      ) : null}
                    </>
                  );
                })()}
              </div>
              <div className="surface-panel p-4">
                {Array.from({ length: createdPlan.duration_days }, (_, dayIndex) => (
                  <div key={dayIndex} className="mb-3 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] p-4 last:mb-0">
                    <h3 className="text-sm font-semibold text-[var(--color-fg)]">Day {dayIndex + 1}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PLANNER_SLOTS.map((slot) => {
                        const assignment = createdPlan.assignments.find(
                          (entry) => entry.day_index === dayIndex && entry.slot === slot
                        );
                        return (
                          <span
                            key={slot}
                            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-fg-muted)]"
                          >
                            <span className="font-medium capitalize text-[var(--color-fg)]">{slot}:</span>{" "}
                            {assignment?.meal_name ?? "—"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-fg-muted)]">Create a plan to see the full calendar here.</p>
          )}
        </section>
      </div>
      </main>
      {pendingCandidate ? (
        <IngredientConfirmDialog
          candidate={pendingCandidate}
          busy={creatingIngredient}
          onConfirm={confirmCandidate}
          onCancel={cancelCandidate}
        />
      ) : null}
    </div>
    );
}
