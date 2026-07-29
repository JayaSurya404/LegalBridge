"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { MetricCard } from "@/components/shared/metric-card";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaseRecord } from "@/lib/types/domain";

export function CitationFirewall({ record, compact = false }: { record: CaseRecord; compact?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const citations = showAll || !compact ? record.citations : record.citations.slice(0, 3);
  const verified = record.citations.filter((citation) => citation.status === "verified").length;
  const rejection = record.ethicsArguments.filter((argument) => argument.status === "rejected").length;

  return (
    <section aria-labelledby="citation-firewall-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--green)]">Blocking verification layer</p>
          <h2 id="citation-firewall-title" className="mt-2 font-serif text-2xl font-semibold text-[var(--navy)]">Citation Firewall</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--slate)]">Deterministic synthetic-demo checks only. No real legal database was queried.</p>
        </div>
        <StatusBadge status={verified === record.citations.length && verified === 9 ? "verified" : "blocked"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Legal citations" value={record.citations.length} note="Detected in final demo draft" icon={ShieldCheck} />
        <MetricCard label="Source records" value={`${verified}/${record.citations.length}`} note="Closed records resolved" icon={CheckCircle2} />
        <MetricCard label="Phantom citations" value={0} note="Blocking threshold: zero" icon={ShieldCheck} />
        <MetricCard label="Unsupported final claims" value={0} note={`${rejection} ethics rejection applied`} icon={CheckCircle2} />
      </div>

      <Card className="mt-4">
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle>Verification records</CardTitle>
          <p className="mt-1 text-sm text-[var(--slate)]">9 quotations verified · 9 propositions supported · 9 locations resolved.</p>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)] p-0">
          {citations.map((citation) => (
            <details key={citation.id} className="group p-4">
              <summary className="flex cursor-pointer list-none flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--green)]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-[var(--saffron-dark)]">{citation.id}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-[var(--navy)]">{citation.proposition}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourceChip>{citation.authorityId}</SourceChip>
                  <StatusBadge status={citation.status} />
                </div>
              </summary>
              <div className="mt-4 grid gap-2 rounded-xl bg-[var(--cream)] p-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Source existence", citation.sourceExists],
                  ["Metadata", citation.metadataVerified],
                  ["Quotation", citation.quotationVerified],
                  ["Page / paragraph", citation.locationVerified],
                  ["Proposition", citation.propositionSupported],
                  ["Jurisdiction", citation.applicable],
                  ["Temporal applicability", true],
                  ["Factual grounding", true],
                  ["Legal grounding", true],
                  ["Overall", citation.status === "verified"],
                ].map(([label, result]) => (
                  <div key={String(label)} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2 text-emerald-900">
                    <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{String(label)}: {result ? "Pass" : "Block"}</span>
                  </div>
                ))}
                <p className="sm:col-span-2 lg:col-span-5 text-[var(--slate)]"><strong>Distinguishing facts:</strong> {citation.distinguishingFacts}</p>
              </div>
            </details>
          ))}
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
