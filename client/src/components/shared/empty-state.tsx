import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-[var(--cream)] text-[var(--slate)]">
          <Inbox className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-serif text-xl font-semibold text-[var(--navy)]">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--slate)]">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </CardContent>
    </Card>
  );
}
