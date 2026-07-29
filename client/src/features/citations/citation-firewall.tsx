"use client";

import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { MetricCard } from "@/components/shared/metric-card";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMotionGateStatus } from "@/lib/motion-gate";
import type { CaseRecord } from "@/lib/types/domain";

export function CitationFirewall({ record, compact = false }: { record: CaseRecord; compact?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const citations = showAll || !compact ? record.citations : record.citations.slice(0, 3);
  const gate = getMotionGateStatus(record);
  const metrics = gate.metrics;

  return (
    <section aria-labelledby="citation-firewall-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--green)]">Blocking verification layer</p>
          <h2 id="citation-firewall-title" className="mt-2 font-serif text-2xl font-semibold text-[var(--navy)]">Citation Firewall</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--slate)]">Deterministic synthetic-demo checks only. No real legal database was queried.</p>
        </div>
        <StatusBadge status={gate.citationFirewallPass ? "verified" : "blocked"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Legal citations" value={metrics.legalCitations} note="Detected in the saved demo draft" icon={ShieldCheck} />
        <MetricCard label="Source records" value={`${metrics.sourceRecordsResolved}/${metrics.legalCitations}`} note="Closed records resolved" icon={CheckCircle2} />
        <MetricCard label="Quotations verified" value={`${metrics.quotationsVerified}/${metrics.legalCitations}`} note="Synthetic text checks" icon={CheckCircle2} />
        <MetricCard label="Propositions supported" value={`${metrics.propositionsSupported}/${metrics.legalCitations}`} note="Deterministic support checks" icon={CheckCircle2} />
        <MetricCard label="Phantom citations" value={metrics.phantomCitations} note="Blocking threshold: zero" icon={ShieldCheck} />
        <MetricCard label="Unsupported final claims" value={metrics.unsupportedFinalClaims} note="Blocking threshold: zero" icon={ShieldCheck} />
        <MetricCard label="Ethics rejections" value={metrics.ethicsRejections} note="Required demo result: one" icon={CheckCircle2} />
      </div>

      <Card className="mt-4">
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle>Verification records</CardTitle>
          <p className="mt-1 text-sm text-[var(--slate)]">
            {metrics.quotationsVerified} quotations verified · {metrics.propositionsSupported} propositions supported · {metrics.locationsResolved} locations resolved.
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)] p-0">
          {citations.length === 0 ? (
            <div className="p-5 text-sm leading-6 text-[var(--slate)]">
              No citation records exist for this browser-local case. Export remains blocked.
            </div>
          ) : citations.map((citation) => {
            const citationPass =
              citation.status === "verified" &&
              citation.sourceExists &&
              citation.metadataVerified &&
              citation.quotationVerified &&
              citation.locationVerified &&
              citation.propositionSupported &&
              citation.applicable;

            return (
              <details key={citation.id} className="group p-4">
                <summary className="flex cursor-pointer list-none flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    {citationPass ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--green)]" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--red)]" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[var(--saffron-dark)]">{citation.id}</p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-[var(--navy)]">{citation.proposition}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SourceChip>{citation.authorityId}</SourceChip>
                    <StatusBadge status={citationPass ? "verified" : "blocked"} />
                  </div>
                </summary>
                <div className="mt-4 grid gap-2 rounded-xl bg-[var(--cream)] p-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
                  {([
                    ["Source existence", citation.sourceExists],
                    ["Metadata", citation.metadataVerified],
                    ["Quotation", citation.quotationVerified],
                    ["Page / paragraph", citation.locationVerified],
                    ["Proposition", citation.propositionSupported],
                    ["Jurisdiction", citation.applicable],
                    ["Temporal applicability", citation.applicable],
                    ["Factual grounding", citation.propositionSupported],
                    ["Legal grounding", citation.sourceExists && citation.metadataVerified],
                    ["Overall", citationPass],
                  ] satisfies [string, boolean][]).map(([label, result]) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-lg border bg-white p-2 ${
                        result
                          ? "border-emerald-200 text-emerald-900"
                          : "border-red-200 text-red-900"
                      }`}
                    >
                      {result ? (
                        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{label}: {result ? "Pass" : "Block"}</span>
                    </div>
                  ))}
                  <p className="sm:col-span-2 lg:col-span-5 text-[var(--slate)]"><strong>Distinguishing facts:</strong> {citation.distinguishingFacts}</p>
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>
      {compact && record.citations.length > 3 && (
        <Button variant="ghost" className="mt-3 w-full" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Show fewer citation records" : `Show all ${record.citations.length} citation records`}
        </Button>
      )}
    </section>
  );
}
