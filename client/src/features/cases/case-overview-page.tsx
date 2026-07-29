"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  FileStack,
  Gavel,
  GitCompareArrows,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { CasePage } from "@/components/shared/case-page";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_CASE_ID } from "@/lib/demo/seed";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { getMotionGateStatus } from "@/lib/motion-gate";

const moduleLinks = [
  ["Documents", "Review browser-local metadata", "/documents", FileStack],
  ["Workflow", "Run the 15-agent simulation", "/workflow", Activity],
  ["Timeline", "Inspect source-linked events", "/timeline", ScrollText],
  ["Contradictions", "Compare material statements", "/contradictions", GitCompareArrows],
  ["Procedural audit", "Review potential concerns", "/procedural-audit", Gavel],
  ["Research", "Inspect synthetic authorities", "/research", BookOpenCheck],
  ["Motion Studio", "Edit the attorney-review draft", "/motion", ShieldCheck],
  ["Attorney review", "Approve the exact saved version", "/review", LockKeyhole],
] as const;

export function CaseOverviewPage() {
  const { caseId, record } = useCaseRecord();
  if (!record) return <UnknownCase />;
  const completed = record.workflow.nodes.filter((node) => node.status === "completed").length;
  const rejectionApplied = record.ethicsArguments.some((argument) => argument.requiredRejection && argument.status === "rejected");
  const gate = getMotionGateStatus(record);
  const verified = gate.metrics.citationRecordsVerified;
  const nextAction =
    record.workflow.status !== "completed"
      ? { label: "Run deterministic workflow", href: `/cases/${caseId}/workflow` }
      : record.ethicsArguments.length === 0
        ? { label: "Open the preloaded analysis demo", href: `/cases/${DEMO_CASE_ID}` }
      : !rejectionApplied
        ? { label: "Complete required ethics rejection", href: `/cases/${caseId}/ethics` }
        : !gate.exportUnlocked
          ? { label: "Complete attorney review", href: `/cases/${caseId}/review` }
          : { label: "Open approved motion", href: `/cases/${caseId}/motion` };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title={record.title}
      description={record.allegation}
      actions={<Link href={nextAction.href} className={buttonVariants()}>{nextAction.label}<ArrowRight className="size-4" aria-hidden="true" /></Link>}
    >
      <section aria-label="Case summary metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Documents" value={record.documents.length} note={`${record.documents.filter((document) => document.status === "processed").length} processed metadata records`} icon={FileStack} />
        <MetricCard label="Workflow" value={`${completed}/15`} note={record.workflow.status} icon={Activity} />
        <MetricCard label="Source-linked facts" value={record.timeline.length > 0 ? 24 : 0} note={`${record.timeline.length} timeline events`} icon={ScrollText} />
        <MetricCard label="Potential concerns" value={record.findings.length} note={`${record.contradictions.length} contradictions`} icon={AlertTriangle} />
        <MetricCard label="Citations" value={`${verified}/${record.citations.length}`} note="Deterministic synthetic checks" icon={ShieldCheck} />
        <MetricCard label="Ethics" value={rejectionApplied ? "Applied" : "Pending"} note="Required unsupported argument rejection" icon={Gavel} />
        <MetricCard label="Motion" value={`v${record.motionVersions.at(-1)?.version ?? 0}`} note={record.currentMotion ? "Draft for attorney review" : "Not generated"} icon={ScrollText} />
        <MetricCard label="Export" value={gate.exportUnlocked ? "Unlocked" : "Locked"} note={gate.exportUnlocked ? `Bound to ${record.approval?.mockHash}` : "Attorney approval required"} icon={LockKeyhole} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Case metadata</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-[var(--border)] text-sm">
              {[
                ["Synthetic client", record.clientName],
                ["Synthetic advocate", record.advocateName],
                ["Review forum", record.court],
                ["Jurisdiction", record.jurisdiction],
                ["Case status", record.status],
                ["Review state", record.reviewStatus],
              ].map(([label, value]) => (
                <div key={label} className="density-card flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                  <dt className="text-[var(--slate)]">{label}</dt>
                  <dd className="break-words font-semibold text-[var(--navy)] sm:text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Case workspace</CardTitle>
            <p className="mt-1 text-sm text-[var(--slate)]">Every navigation target is a working frontend module.</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {moduleLinks.map(([title, description, suffix, Icon]) => (
              <Link key={title} href={`/cases/${caseId}${suffix}`} className="group flex min-h-24 gap-3 rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--saffron)] hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
                <Icon className="mt-0.5 size-5 shrink-0 text-[var(--saffron-dark)]" aria-hidden="true" />
                <span>
                  <span className="block font-semibold text-[var(--navy)]">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--slate)]">{description}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6 border-amber-200 bg-amber-50">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Recommended next action</p>
            <p className="mt-1 font-semibold text-amber-950">{nextAction.label}</p>
          </div>
          <StatusBadge status={record.workflow.status} />
        </CardContent>
      </Card>
    </CasePage>
  );
}
