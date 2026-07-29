"use client";

import { AlertTriangle, CalendarClock, Filter, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { CasePage } from "@/components/shared/case-page";
import { Confidence, SourceChip, StatusBadge } from "@/components/shared/status";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { cn } from "@/lib/utils";

export function TimelinePage() {
  const { caseId, record } = useCaseRecord();
  const [conflictsOnly, setConflictsOnly] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  if (!record) return <UnknownCase />;
  const events = conflictsOnly
    ? record.timeline.filter((event) => event.conflict)
    : record.timeline;

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Source-linked timeline"
      description="Chronological demonstration observations remain connected to fictional source locations. They are extracted records, not attorney conclusions."
      actions={
        <Button variant={conflictsOnly ? "default" : "secondary"} onClick={() => setConflictsOnly((current) => !current)}>
          <Filter className="size-4" aria-hidden="true" /> {conflictsOnly ? "Showing conflicts" : "Show conflicts only"}
        </Button>
      }
    >
      {events.length === 0 ? (
        <EmptyState title="No timeline events in this view" description="Clear the conflict filter to review all source-linked demonstration events." action={<Button onClick={() => setConflictsOnly(false)}>Show all events</Button>} />
      ) : (
        <ol className="relative ml-4 border-l-2 border-[var(--border)] pl-6 sm:ml-7 sm:pl-8">
          {events.map((event) => (
            <li key={event.id} className="relative mb-5 last:mb-0">
              <span className={cn("absolute -left-[2.12rem] top-5 grid size-4 place-items-center rounded-full border-4 border-[var(--warm-white)] sm:-left-[2.62rem]", event.conflict ? "bg-[var(--red)]" : "bg-[var(--green)]")} aria-hidden="true" />
              <Card className={cn(activeSource === event.source && "border-[var(--saffron)] ring-2 ring-amber-100")}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <time dateTime={event.timestamp} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--saffron-dark)]">
                          <CalendarClock className="size-4" aria-hidden="true" />
                          {format(new Date(event.timestamp), "dd MMM yyyy · HH:mm")}
                        </time>
                        {event.conflict && <StatusBadge status="review" />}
                      </div>
                      <h2 className="mt-2 font-serif text-xl font-semibold text-[var(--navy)]">{event.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--slate)]">{event.detail}</p>
                    </div>
                    <Confidence value={event.confidence} />
                  </div>
                  {event.conflict && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900">
                      <AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden="true" />
                      <span><strong>Conflicting time indicator:</strong> {event.conflict}</span>
                    </div>
                  )}
                  <details className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">Inspect source excerpt</summary>
                    <blockquote className="mt-3 border-l-2 border-[var(--saffron)] pl-4 font-serif text-sm italic leading-7 text-[var(--ink)]">“{event.excerpt}”</blockquote>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setActiveSource(event.source)} aria-pressed={activeSource === event.source} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                        <SourceChip active={activeSource === event.source}>{event.source}</SourceChip>
                      </button>
                      <span className="text-xs text-[var(--slate)]">{event.location}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--green)]"><Link2 className="size-3.5" aria-hidden="true" /> Source-linked observation</span>
                    </div>
                  </details>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </CasePage>
  );
}
