import type { ReactNode } from "react";
import { SyntheticBadge } from "@/components/shared/disclaimer";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  synthetic = false,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  synthetic?: boolean;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--saffron-dark)]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[var(--navy)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--slate)] sm:text-base">
          {description}
        </p>
        {synthetic && <div className="mt-3"><SyntheticBadge /></div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
