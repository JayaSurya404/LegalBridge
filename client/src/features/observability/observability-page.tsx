"use client";

import {
  Activity,
  BarChart3,
  Clock3,
  Coins,
  FileCheck2,
  Gauge,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isExportUnlocked, useAppStore } from "@/stores/app-store";

export function ObservabilityPage() {
  const cases = useAppStore((state) => state.cases);
  const selectedCaseId = useAppStore((state) => state.selectedCaseId);
  const selectCase = useAppStore((state) => state.selectCase);
  const record = cases.find((item) => item.id === selectedCaseId) ?? cases[0];
  const currentNode = record?.workflow.nodes[record.workflow.currentIndex];
  const completed = record?.workflow.nodes.filter((node) => node.status === "completed") ?? [];
  const duration = completed.reduce((total, node) => total + node.durationMs, 0);
  const chartData = record?.workflow.nodes.map((node, index) => ({
    agent: String(index + 1).padStart(2, "0"),
    duration: node.durationMs,
    status: node.status,
  })) ?? [];
  const rejections = record?.ethicsArguments.filter((argument) => argument.status === "rejected").length ?? 0;
  const edits = Math.max(0, (record?.motionVersions.length ?? 1) - 1);
  const exportUnlocked = record ? isExportUnlocked(record) : false;

  return (
    <>
      <PageHeader
        eyebrow="Deterministic frontend telemetry"
        title="Observability"
        description="Inspect fixed workflow metrics and synthetic estimates. No values represent measured production traffic, tokens, costs, or legal outcomes."
        actions={
          <label>
            <span className="sr-only">Select case for observability</span>
            <select value={record?.id ?? ""} onChange={(event) => selectCase(event.target.value)} className="min-h-11 max-w-72 rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
              {cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
        }
        synthetic
      />

      <section aria-label="Observability metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Workflow node" value={record ? `${record.workflow.currentIndex + 1}/15` : "—"} note={currentNode?.name ?? "No workflow run"} icon={Activity} />
        <MetricCard label="Simulated duration" value={`${(duration / 1000).toFixed(1)}s`} note="Completed agent durations" icon={Clock3} />
        <MetricCard label="Simulated tool calls" value={completed.length * 3} note="Fixed at 3 per completed node" icon={Gauge} />
        <MetricCard label="Retry count" value={0} note="No random failures" icon={RefreshCcw} />
        <MetricCard label="Simulated input tokens" value="18,420" note="Illustrative only" icon={BarChart3} />
        <MetricCard label="Simulated output tokens" value="6,370" note="Illustrative only" icon={BarChart3} />
        <MetricCard label="Simulated cost" value="₹0.00" note="No model calls occurred" icon={Coins} />
        <MetricCard label="Estimated time reduction" value="62%" note="Synthetic hackathon estimate" icon={Clock3} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Fixed agent-duration profile</CardTitle>
            <p className="mt-1 text-sm text-[var(--slate)]">Agent numbers 01–15 use deterministic seeded durations.</p>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde2e7" />
                  <XAxis dataKey="agent" tick={{ fill: "#617084", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis unit="ms" tick={{ fill: "#617084", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f7f2e8" }} />
                  <Bar dataKey="duration" fill="#35755a" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--slate)]">
              Text summary: 15 deterministic agents range from {chartData[0]?.duration ?? 0} ms to {chartData.at(-1)?.duration ?? 0} ms, with {completed.length} currently completed. These are simulator values, not measured latency.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Case outcome counters</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Extracted facts", record ? 24 : 0],
              ["Timeline events", record?.timeline.length ?? 0],
              ["Contradictions", record?.contradictions.length ?? 0],
              ["Potential concerns", record?.findings.length ?? 0],
              ["Retrieved authorities", record?.authorities.length ?? 0],
              ["Citation verification", record?.citations.length ? "100%" : "0%"],
              ["Ethics rejections", rejections],
              ["Attorney edits", edits],
            ].map(([label, value]) => (
              <div key={String(label)} className="density-card flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3 text-sm">
                <span className="text-[var(--slate)]">{label}</span>
                <span className="font-semibold text-[var(--navy)]">{value}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--slate)]">Approval</p>
                <div className="mt-2"><StatusBadge status={record?.approval ? "approved" : "pending"} /></div>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--slate)]">Export</p>
                <div className="mt-2"><StatusBadge status={exportUnlocked ? "unlocked" : "locked"} /></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 p-5 text-blue-950">
          <FileCheck2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">Observability scope</h2>
            <p className="mt-1 text-sm leading-6">Synthetic workflow data, simulated token counts, simulated tool calls, simulated cost, and estimated drafting-time reduction. No production telemetry or external tracking exists.</p>
          </div>
          <ShieldCheck className="ml-auto hidden size-6 shrink-0 sm:block" aria-hidden="true" />
        </CardContent>
      </Card>
    </>
  );
}
