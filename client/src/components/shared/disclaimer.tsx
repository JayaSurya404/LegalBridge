import { AlertTriangle, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PrototypeDisclaimer({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-950",
        compact ? "p-3 text-xs" : "p-4 text-sm",
        className,
      )}
      aria-label="Legal platform disclaimer"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="leading-6">
        Attorney-assistance platform using a synthetic legal-aid dataset. Not a
        government service or legal advice, and not a replacement for professional
        judgment. Attorney review is required. Nothing is automatically filed.
      </p>
    </aside>
  );
}

export function SyntheticBadge() {
  return (
    <Badge tone="warning" className="gap-1.5">
      <FlaskConical className="size-3.5" aria-hidden="true" />
      Synthetic Legal-Aid Dataset
    </Badge>
  );
}
