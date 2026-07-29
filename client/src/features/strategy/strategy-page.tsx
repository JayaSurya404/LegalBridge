"use client";

import { BookOpenCheck, CircleOff, FileCheck2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

export function StrategyPage() {
  const { caseId, record } = useCaseRecord();
  const setIncluded = useAppStore((state) => state.setStrategyIncluded);
  const setNotes = useAppStore((state) => state.setStrategyNotes);
  if (!record) return <UnknownCase />;

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Strategy workspace"
      description="Candidate defence strategies connect fictional facts, demonstration authorities, limitations, and attorney notes. Unsupported candidates cannot enter the motion."
    >
      {record.strategies.length === 0 ? (
        <EmptyState
          title="No case-specific strategies are available"
          description="Browser-created cases do not receive generated legal strategies because this frontend performs no document parsing or legal analysis. Use the preloaded synthetic matter for the closed strategy demonstration."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {record.strategies.map((strategy) => {
            const blocked =
              strategy.citationStatus !== "verified" ||
              strategy.ethicsStatus !== "approved";
            return (
              <Card key={strategy.id} className={blocked ? "border-red-200" : undefined}>
                <CardHeader className="border-b border-[var(--border)]">
                  <div className="flex items-start justify-between gap-4">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${blocked ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {blocked ? <ShieldAlert className="size-5" aria-hidden="true" /> : <BookOpenCheck className="size-5" aria-hidden="true" />}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <StatusBadge status={strategy.citationStatus} />
                      <StatusBadge status={strategy.ethicsStatus} />
                    </div>
                  </div>
                  <p className="mt-4 font-mono text-xs font-bold text-[var(--saffron-dark)]">{strategy.id}</p>
                  <CardTitle className="mt-2 text-xl">{strategy.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <Section label="Factual basis">{strategy.factualBasis}</Section>
                  <Section label="Legal basis">
                    {strategy.legalBasis.length ? (
                      <div className="flex flex-wrap gap-2">{strategy.legalBasis.map((id) => <SourceChip key={id}>{id}</SourceChip>)}</div>
                    ) : "No supporting demonstration authority."}
                  </Section>
                  <Section label="Supporting sources">
                    <div className="flex flex-wrap gap-2">{strategy.sources.map((id) => <SourceChip key={id}>{id}</SourceChip>)}</div>
                  </Section>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">Weaknesses</h3>
                      <p className="mt-2 text-sm leading-6 text-amber-950">{strategy.weaknesses}</p>
                    </section>
                    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800">Missing evidence</h3>
                      <p className="mt-2 text-sm leading-6 text-blue-950">{strategy.missingEvidence}</p>
                    </section>
                  </div>
                  <div>
                    <label htmlFor={`notes-${strategy.id}`} className="mb-2 block text-sm font-semibold text-[var(--navy)]">Attorney notes</label>
                    <Textarea
                      id={`notes-${strategy.id}`}
                      defaultValue={strategy.attorneyNotes}
                      placeholder="Add browser-local review notes"
                      onBlur={(event) => setNotes(caseId, strategy.id, event.target.value)}
                    />
                  </div>
                  <label className={`flex min-h-12 items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${blocked ? "border-red-200 bg-red-50 text-red-900" : "border-[var(--border)] bg-[var(--cream)] text-[var(--navy)]"}`}>
                    <input
                      type="checkbox"
                      checked={strategy.included}
                      disabled={blocked}
                      onChange={(event) => {
                        setIncluded(caseId, strategy.id, event.target.checked);
                        toast.success(event.target.checked ? "Strategy included in the local plan." : "Strategy excluded from the local plan.");
                      }}
                      className="size-5 accent-[var(--navy)]"
                    />
                    {blocked ? <><CircleOff className="size-4" aria-hidden="true" /> Cannot include: source or ethics support is blocked</> : <><FileCheck2 className="size-4" aria-hidden="true" /> Include in motion strategy</>}
                  </label>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CasePage>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">{label}</h3>
      <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{children}</div>
    </section>
  );
}
