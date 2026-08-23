import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-lg tracking-tight text-[var(--color-fg)]">
            MealPrep
          </Link>
          <span className="text-[var(--color-fg-faint)]">·</span>
          <span className="text-sm text-[var(--color-fg-muted)]">Plan &amp; Track</span>
        </div>

        <div className="flex items-center gap-5">
          <Link href="/planner" className="btn btn-primary">
            Planner
          </Link>
        </div>
      </div>
    </nav>
  );
}
