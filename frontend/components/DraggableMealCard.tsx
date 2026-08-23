"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Meal } from "@/types/meal";

type DraggableMealCardProps = {
  meal: Meal;
  children: React.ReactNode;
};

export default function DraggableMealCard({ meal, children }: DraggableMealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `meal-${meal.id}`,
    data: { mealId: meal.id, mealName: meal.name },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        touchAction: "none",
        opacity: isDragging ? 0.4 : 1,
      }}
      className="surface-panel cursor-grab p-3 transition-shadow duration-300 ease-[var(--ease-premium)] active:cursor-grabbing"
    >
      {children}
    </div>
  );
}
