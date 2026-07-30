import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const success = ["approved", "completed", "verified", "processed", "active"].includes(normalized);
  const danger = ["blocked", "rejected", "invalidated"].includes(normalized);
  const warning = ["pending", "paused", "review", "revision"].includes(normalized);
  const Icon = success
    ? CheckCircle2
    : danger
      ? AlertCircle
      : normalized === "running"
        ? PlayCircle
        : normalized === "locked"
          ? LockKeyhole
          : normalized === "paused"
            ? PauseCircle
            : Clock3;
  return (
    <Badge tone={success ? "success" : danger ? "danger" : warning ? "warning" : "neutral"} className="gap-1.5 capitalize">
      <Icon className="size-3.5" aria-hidden="true" />
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function Confidence({ value }: { value: number }) {
  const percentage = value >= 0 && value <= 1 ? Math.round(value * 100) : Math.round(value);
  return (
    <div className="min-w-28" aria-label={`${percentage}% confidence`}>
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--slate)]">
        <span>Confidence</span>
        <span className="font-semibold text-[var(--ink)]">{percentage}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-[var(--green)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function SourceChip({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs break-all",
        active
          ? "border-[var(--saffron)] bg-amber-50 text-amber-900"
          : "border-blue-200 bg-blue-50 text-blue-800",
      )}
    >
      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
