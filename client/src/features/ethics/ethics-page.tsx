"use client";

import { Check, RotateCcw, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { EmptyState } from "@/components/shared/empty-state";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

export function EthicsPage() {
  const { caseId, record } = useCaseRecord();
  const reviewArgument = useAppStore((state) => state.reviewEthicsArgument);
  if (!record) return <UnknownCase />;
  const required = record.ethicsArguments.find((argument) => argument.requiredRejection);
  const rejected = required?.status === "rejected";

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Ethics review"
      description="The Ethics Auditor checks whether each candidate remains within the fictional evidence. Ethics approval is never attorney approval."
    >
      <Card className={`mb-6 ${rejected ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className={`mt-0.5 size-5 shrink-0 ${rejected ? "text-emerald-700" : "text-amber-800"}`} aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--navy)]">{rejected ? "Required rejection applied" : "Required ethics action pending"}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--slate)]">
                {rejected ? "The unsupported fabrication allegation is excluded from the final motion." : "Reject the unsupported fabrication allegation before attorney approval can proceed."}
              </p>
            </div>
          </div>
          <StatusBadge status={rejected ? "completed" : "pending"} />
        </CardContent>
      </Card>

      {record.ethicsArguments.length === 0 ? (
        <EmptyState
          title="No candidate arguments are available"
          description="Browser-created cases do not receive generated arguments because this frontend performs no document parsing or legal analysis. Use the preloaded synthetic matter for the ethics-review walkthrough."
        />
      ) : (
        <div className="grid gap-5">
          {record.ethicsArguments.map((argument) => (
            <Card key={argument.id} className={argument.requiredRejection ? "border-red-200" : undefined}>
              <CardHeader className="border-b border-[var(--border)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-xs font-bold text-[var(--saffron-dark)]">{argument.id}</p>
                    <CardTitle className="mt-2 text-xl">{argument.title}</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={`${argument.risk} risk`} />
                    <StatusBadge status={argument.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Section label="Factual support">{argument.factualSupport}</Section>
                  <Section label="Legal support">{argument.legalSupport}</Section>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">Source links</p>
                  <div className="mt-2 flex flex-wrap gap-2">{argument.sources.map((source) => <SourceChip key={source}>{source}</SourceChip>)}</div>
                </div>
                <div className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${argument.status === "rejected" ? "border-red-200 bg-red-50 text-red-950" : "border-[var(--border)] bg-[var(--cream)]"}`}>
                  <strong>Ethics explanation:</strong> {argument.explanation}
                </div>
                <details className="mt-4 rounded-xl border border-[var(--border)] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">Review and revision history</summary>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-[var(--slate)]">
                    {argument.history.map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </details>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button disabled={argument.status === "approved"} variant="secondary" onClick={() => { reviewArgument(caseId, argument.id, "approved"); toast.success("Argument marked approved for demonstration use."); }}>
                    <Check className="size-4" aria-hidden="true" /> Approve
                  </Button>
                  <Button disabled={argument.status === "revision"} variant="secondary" onClick={() => { reviewArgument(caseId, argument.id, "revision"); toast.info("Revision requested."); }}>
                    <RotateCcw className="size-4" aria-hidden="true" /> Request revision
                  </Button>
                  <Button disabled={argument.status === "rejected"} variant="danger" onClick={() => { reviewArgument(caseId, argument.id, "rejected"); toast.error(argument.requiredRejection ? "Unsupported argument rejected and excluded." : "Argument rejected."); }}>
                    <X className="size-4" aria-hidden="true" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </CasePage>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{children}</p>
    </section>
  );
}
