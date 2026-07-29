"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const modules = [
  ["Overview", ""],
  ["Documents", "/documents"],
  ["Workflow", "/workflow"],
  ["Timeline", "/timeline"],
  ["Contradictions", "/contradictions"],
  ["Procedural audit", "/procedural-audit"],
  ["Research", "/research"],
  ["Strategy", "/strategy"],
  ["Ethics", "/ethics"],
  ["Motion Studio", "/motion"],
  ["Attorney review", "/review"],
  ["Audit log", "/audit-log"],
  ["Legal Copilot", "/copilot"],
] as const;

export function CaseNavigation({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Case modules"
      className="no-print mb-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-sm"
    >
      <div className="flex min-w-max gap-1">
        {modules.map(([label, suffix]) => {
          const href = `/cases/${caseId}${suffix}`;
          const active = suffix ? pathname === href : pathname === `/cases/${caseId}`;
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                active
                  ? "bg-[var(--navy)] text-white"
                  : "text-[var(--slate)] hover:bg-[var(--cream)] hover:text-[var(--navy)]",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
