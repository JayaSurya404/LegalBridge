"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  FileCheck2,
  FileStack,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { PrototypeDisclaimer } from "@/components/shared/disclaimer";
import { StatusBadge } from "@/components/shared/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BACKEND_DEMO_CASE_NUMBER } from "@/lib/api/mappers";
import { getMotionGateStatus } from "@/lib/motion-gate";
import { useAppStore } from "@/stores/app-store";
import { format } from "date-fns";

export function DashboardPage() {
  const cases = useAppStore((state) => state.cases);
  const auditEvents = useAppStore((state) => state.auditEvents);
  const dashboardSummary = useAppStore((state) => state.dashboardSummary);
  const demo =
    cases.find((record) => record.reference === BACKEND_DEMO_CASE_NUMBER) ??
    cases[0];
  const completed = demo?.workflow.nodes.filter((node) => node.status === "completed").length ?? 0;
  const citations = demo?.citations.length ?? 0;
  const ethicsRejections = demo?.ethicsArguments.filter((argument) => argument.status === "rejected").length ?? 0;
  const gate = demo ? getMotionGateStatus(demo) : null;
  const verified = gate?.metrics.citationRecordsVerified ?? 0;
  const factCount = demo?.timeline.length ? 24 : 0;
  const chartData = [
    { name: "Facts", value: factCount },
    { name: "Timeline", value: demo?.timeline.length ?? 0 },
    { name: "Conflicts", value: demo?.contradictions.length ?? 0 },
    { name: "Concerns", value: demo?.findings.length ?? 0 },
    { name: "Authorities", value: demo?.authorities.length ?? 0 },
  ];
  const storedDocuments = cases.flatMap((record) =>
    record.documents.filter((document) => document.origin === "backend"),
  );
  const processedDocuments = storedDocuments.filter(
    (document) => document.extractionStatus === "processed",
  ).length;
  const ocrRequiredDocuments = storedDocuments.filter(
    (document) => document.extractionStatus === "ocr_required",
  ).length;
  const failedDocuments = storedDocuments.filter(
    (document) => document.extractionStatus === "failed",
  ).length;
  const extractedPages = storedDocuments.reduce(
    (total, document) => total + (document.pageCount ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Persistent development workspace"
        title="Good afternoon, counsel."
        description="Manage persisted cases, private originals, and extracted source pages while keeping legal analysis inside the closed synthetic demonstration boundary."
        actions={
          <Link href="/cases/new" className={buttonVariants()}>
            New case
          </Link>
        }
        synthetic
      />
      <PrototypeDisclaimer className="mb-6" compact />
      <section aria-label="Workspace metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active cases" value={dashboardSummary?.active_cases ?? cases.filter((record) => record.status === "active").length} note={`${dashboardSummary?.total_cases ?? cases.length} backend total`} icon={BriefcaseBusiness} />
        <MetricCard label="Workflow progress" value={`${completed}/15`} note={demo?.workflow.status ?? "No case"} icon={Activity} />
        <MetricCard label="Citations verified" value={`${verified}/${citations}`} note="Synthetic closed records" icon={ShieldCheck} />
        <MetricCard
          label="Export status"
          value={gate?.exportUnlocked ? "Unlocked" : "Locked"}
          note={
            gate?.exportUnlocked
              ? `Approved v${demo?.approval?.version}`
              : demo?.approval
                ? "Stored approval is invalid"
                : "Attorney approval missing"
          }
          icon={FileCheck2}
        />
      </section>
      <section
        aria-label="Stored document metrics"
        className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <MetricCard label="Stored documents" value={dashboardSummary?.total_documents ?? storedDocuments.length} note="Private backend binaries" icon={FileStack} />
        <MetricCard label="Processed sources" value={dashboardSummary?.processed_documents ?? processedDocuments} note="Extraction completed" icon={FileCheck2} />
        <MetricCard label="OCR required" value={dashboardSummary?.ocr_required_documents ?? ocrRequiredDocuments} note="No text invented" icon={AlertTriangle} />
        <MetricCard label="Extraction failed" value={dashboardSummary?.failed_documents ?? failedDocuments} note="Originals remain available" icon={AlertTriangle} />
        <MetricCard label="Source pages" value={dashboardSummary?.extracted_source_pages ?? extractedPages} note={`${dashboardSummary?.total_audit_events ?? auditEvents.length} persisted audit events`} icon={Scale} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Case analysis summary</CardTitle>
              <p className="mt-1 text-sm text-[var(--slate)]">Deterministic record counts for the selected synthetic case.</p>
            </div>
            <Scale className="size-5 text-[var(--saffron-dark)]" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde2e7" />
                  <XAxis dataKey="name" tick={{ fill: "#617084", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#617084", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f7f2e8" }} />
                  <Bar dataKey="value" fill="#183657" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--slate)]">
              Text summary: {factCount} extracted demonstration facts, {demo?.timeline.length ?? 0} timeline events, {demo?.contradictions.length ?? 0} contradictions, {demo?.findings.length ?? 0} potential concerns, and {demo?.authorities.length ?? 0} closed synthetic authorities. Empty backend cases never inherit these fixtures.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review and safety state</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
              <span className="text-sm font-semibold">Workflow</span>
              <StatusBadge status={demo?.workflow.status ?? "idle"} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
              <span className="text-sm font-semibold">Ethics rejections</span>
              <span className="font-serif text-xl font-semibold text-[var(--red)]">{ethicsRejections}/1</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
              <span className="text-sm font-semibold">Attorney review</span>
              <StatusBadge status={gate?.exportUnlocked ? "approved" : demo?.approval ? "invalidated" : "pending"} />
            </div>
            {demo && (
              <Link href={`/cases/${demo.id}`} className={`${buttonVariants()} w-full`}>
                Open demonstration case <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border)]">
          {auditEvents.slice(0, 5).map((event) => (
            <div key={event.id} className="density-card flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{event.message}</p>
                <p className="text-xs text-[var(--slate)]">{event.actor} · {event.relatedEntity}</p>
              </div>
              <time className="text-xs text-[var(--slate)]" dateTime={event.timestamp}>
                {format(new Date(event.timestamp), "dd MMM yyyy, HH:mm")}
              </time>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
