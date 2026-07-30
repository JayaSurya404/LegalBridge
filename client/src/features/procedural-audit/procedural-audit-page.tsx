"use client";

import { AlertTriangle, SearchCheck } from "lucide-react";
import { CasePage } from "@/components/shared/case-page";
import { Confidence, SourceChip, StatusBadge } from "@/components/shared/status";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaseRecord } from "@/lib/hooks/use-case-record";

export function ProceduralAuditPage() {
  const { caseId, record } = useCaseRecord();
  if (!record) return <UnknownCase />;
  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Procedural audit"
      description="Issue-specific findings identify conflicting or missing information and the next practical review action."
    >
      {record.findings.length === 0 ? (
        <EmptyState
          title="No procedural findings are available"
          description={
            record.workflow.status === "completed"
              ? "The completed analysis did not identify a source-supported procedural issue."
              : "Run analysis after processing documents to populate procedural findings."
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {record.findings.map((finding) => (
            <Card key={finding.id}>
              <CardHeader className="border-b border-[var(--border)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800">
                    <AlertTriangle className="size-5" aria-hidden="true" />
                  </span>
                  <StatusBadge status={finding.verificationStatus} />
                </div>
                <p className="mt-4 font-mono text-xs font-bold text-[var(--saffron-dark)]">{finding.id}</p>
                <CardTitle className="mt-2 text-xl leading-7">{finding.issue}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">Why it was flagged</h3>
                  <p className="mt-2 text-sm leading-6">{finding.rationale}</p>
                </section>
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">Supporting sources</h3>
                  <div className="mt-2 flex flex-wrap gap-2">{finding.sources.map((source) => <SourceChip key={source}>{source}</SourceChip>)}</div>
                </section>
                <section className="rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">Missing information</h3>
                  <p className="mt-2 text-sm leading-6">{finding.missingInformation}</p>
                </section>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                    <SearchCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span><strong>Attorney action:</strong> {finding.reviewAction}</span>
                  </div>
                  <Confidence value={finding.confidence} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CasePage>
  );
}
