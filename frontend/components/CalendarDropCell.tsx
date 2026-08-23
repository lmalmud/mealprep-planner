"use client";

import { useDroppable } from "@dnd-kit/core";

type CalendarDropCellProps = {
  dayIndex: number;
  slot: string;
  children: React.ReactNode;
};

export default function CalendarDropCell({ dayIndex, slot, children }: CalendarDropCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${dayIndex}-${slot}`,
    data: { dayIndex, slot },
  });

  return (
    <td
      ref={setNodeRef}
      className="rounded-[var(--radius-sm)] px-3 py-3 transition-colors duration-300 ease-[var(--ease-premium)]"
      style={
        isOver
          ? {
              background: "var(--color-accent-soft)",
              boxShadow: "inset 0 0 0 2px var(--color-accent)",
            }
          : undefined
      }
    >
      {children}
    </td>
  );
}
