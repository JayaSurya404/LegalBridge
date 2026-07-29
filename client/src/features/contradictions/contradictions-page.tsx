"use client";

import { GitCompareArrows, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { CasePage } from "@/components/shared/case-page";
import { Confidence, SourceChip, StatusBadge } from "@/components/shared/status";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaseRecord } from "@/lib/hooks/use-case-record";

export function ContradictionsPage() {
  const { caseId, record } = useCaseRecord();
  const [severity, setSeverity] = useState("all");
  if (!record) return <UnknownCase />;
  const contradictions = record.contradictions.filter((item) => severity === "all" || item.severity === severity);

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Contradiction matrix"
      description="Side-by-side fictional source statements surface material differences without treating them as final legal conclusions."
      actions={record.contradictions.length > 0 ? (
        <label>
          <span className="sr-only">Filter contradiction severity</span>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="min-h-11 rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
            <option value="all">All severities</option>
            <option value="high">High severity</option>
            <option value="medium">Medium severity</option>
            <option value="low">Low severity</option>
          </select>
        </label>
      ) : undefined}
    >
      {record.contradictions.length === 0 ? (
        <EmptyState
          title="No contradiction comparisons are available"
          description="Browser-created cases do not receive case-specific comparisons because this frontend does not parse selected files. Use the preloaded synthetic matter for arrest, seizure, and witness contradictions."
        />
      ) : contradictions.length === 0 ? (
        <EmptyState title="No contradictions match this filter" description="Choose another severity to inspect the demonstration comparisons." />
      ) : (
        <div className="grid gap-5">
          {contradictions.map((item) => (
            <Card key={item.id}>
              <CardHeader className="border-b border-[var(--border)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold text-[var(--saffron-dark)]">{item.id}</p>
                    <CardTitle className="mt-2 text-xl">{item.topic}</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={item.severity} />
                    <StatusBadge status={item.reviewStatus} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
                  <Statement label="Statement A" text={item.statementA} source={item.sourceA} />
                  <span className="mx-auto grid size-10 place-items-center self-center rounded-full bg-[var(--navy)] text-white">
                    <GitCompareArrows className="size-5" aria-label="Compared with" />
                  </span>
                  <Statement label="Statement B" text={item.statementB} source={item.sourceB} />
                </div>
                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 lg:grid-cols-[1fr_13rem]">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--navy)]">Why it matters</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--slate)]">{item.significance}</p>
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--cream)] p-3 text-xs leading-5 text-[var(--ink)]">
                      <MessageSquareText className="mt-0.5 size-4 shrink-0 text-[var(--saffron-dark)]" aria-hidden="true" />
                      <span><strong>Resolution note:</strong> {item.resolutionNotes}</span>
                    </div>
                  </div>
                  <Confidence value={item.confidence} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CasePage>
  );
}

function Statement({ label, text, source }: { label: string; text: string; source: string }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">{label}</p>
      <blockquote className="mt-3 font-serif text-base leading-7 text-[var(--navy)]">“{text}”</blockquote>
      <div className="mt-4"><SourceChip>{source}</SourceChip></div>
    </article>
  );
}
