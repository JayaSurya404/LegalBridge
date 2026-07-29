import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div>
          <p className="text-sm font-medium text-[var(--slate)]">{label}</p>
          <p className="mt-2 font-serif text-3xl font-semibold text-[var(--navy)]">{value}</p>
          {note && <p className="mt-1 text-xs leading-5 text-[var(--slate)]">{note}</p>}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-[var(--saffron-dark)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
