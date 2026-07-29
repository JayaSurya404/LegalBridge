"use client";

import {
  CircleDot,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import type { WorkflowNode } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

export function WorkflowPage() {
  const { caseId, record } = useCaseRecord();
  const startWorkflow = useAppStore((state) => state.startWorkflow);
  const pauseWorkflow = useAppStore((state) => state.pauseWorkflow);
  const resumeWorkflow = useAppStore((state) => state.resumeWorkflow);
  const advanceWorkflow = useAppStore((state) => state.advanceWorkflow);
  const resetWorkflow = useAppStore((state) => state.resetWorkflow);
  const [inspected, setInspected] = useState<WorkflowNode | null>(null);

  const workflowStatus = record?.workflow.status;
  const currentIndex = record?.workflow.currentIndex;
  const currentDuration = record?.workflow.nodes[currentIndex ?? 0]?.durationMs;

  useEffect(() => {
    if (workflowStatus !== "running" || currentDuration === undefined) return;
    const timer = window.setTimeout(() => advanceWorkflow(caseId), currentDuration);
    return () => window.clearTimeout(timer);
  }, [advanceWorkflow, caseId, currentDuration, currentIndex, workflowStatus]);

  if (!record) return <UnknownCase />;
  const workflow = record.workflow;
  const completed = workflow.nodes.filter((node) => node.status === "completed").length;
  const progress = Math.round((completed / workflow.nodes.length) * 100);

  const controls = (
    <>
      {workflow.status === "idle" && <Button onClick={() => startWorkflow(caseId)}><Play className="size-4" aria-hidden="true" /> Start</Button>}
      {workflow.status === "running" && <Button onClick={() => { pauseWorkflow(caseId); toast.info("Workflow paused and retained locally."); }}><Pause className="size-4" aria-hidden="true" /> Pause</Button>}
      {workflow.status === "paused" && <Button onClick={() => { resumeWorkflow(caseId); toast.success("Workflow resumed."); }}><RefreshCcw className="size-4" aria-hidden="true" /> Resume</Button>}
      {workflow.status === "completed" && <StatusBadge status="completed" />}
      <ConfirmDialog
        trigger={<Button variant="secondary"><RotateCcw className="size-4" aria-hidden="true" /> Reset</Button>}
        title="Reset workflow progress?"
        description="This returns all 15 agents to the defined initial state. The case, documents, and other browser-local records are preserved."
        confirmLabel="Reset workflow"
        onConfirm={() => { resetWorkflow(caseId); toast.success("Workflow progress reset."); }}
        destructive
      />
    </>
  );

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Deterministic multi-agent workflow"
      description="A fixed 15-agent frontend simulation with retained progress. It makes no external calls and performs no real legal analysis."
      actions={controls}
    >
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={workflow.status} />
                <span className="text-sm font-semibold text-[var(--navy)]">{completed} of {workflow.nodes.length} agents completed</span>
              </div>
              <p className="mt-2 text-xs text-[var(--slate)]">Deterministic frontend simulation. Refresh-safe browser-local progress.</p>
            </div>
            <span className="font-serif text-3xl font-semibold text-[var(--navy)]">{progress}%</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200" aria-label={`${progress}% workflow progress`}>
            <div className="h-full rounded-full bg-[var(--green)] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {workflow.nodes.map((node, index) => (
          <Card key={node.id} className={cn(node.status === "running" && "border-[var(--saffron)] ring-2 ring-amber-100")}>
            <CardContent className="density-card p-4">
              <div className="flex items-start gap-3">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold", node.status === "completed" ? "bg-[var(--green)] text-white" : node.status === "running" ? "bg-[var(--saffron)] text-[var(--navy)]" : "bg-slate-100 text-[var(--slate)]")}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="font-semibold leading-5 text-[var(--navy)]">{node.name}</h2>
                    <StatusBadge status={node.status} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--slate)]">{node.description}</p>
                  {node.status === "running" && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--saffron-dark)]" aria-live="polite">
                      <CircleDot className="size-4 animate-pulse" aria-hidden="true" /> Active · fixed {node.durationMs} ms
                    </div>
                  )}
                  <Button type="button" variant="ghost" size="sm" className="mt-3 px-0" onClick={() => setInspected(node)}>
                    <Search className="size-4" aria-hidden="true" /> Inspect node
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(inspected)} onOpenChange={(open) => { if (!open) setInspected(null); }}>
        <DialogContent>
          {inspected && (
            <>
              <DialogTitle className="pr-10 font-serif text-2xl font-semibold text-[var(--navy)]">{inspected.name}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-[var(--slate)]">{inspected.description}</DialogDescription>
              <div className="mt-5 grid gap-4">
                <Detail label="Status"><StatusBadge status={inspected.status} /></Detail>
                <Detail label="Input">{inspected.input}</Detail>
                <Detail label="Deterministic output">{inspected.output}</Detail>
                <Detail label="Simulated duration">{inspected.durationMs} ms</Detail>
                <Detail label="Source references">
                  <div className="flex flex-wrap gap-2">{inspected.sourceRefs.map((source) => <SourceChip key={source}>{source}</SourceChip>)}</div>
                </Detail>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CasePage>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">{label}</p>
      <div className="mt-2 text-sm leading-6 text-[var(--ink)]">{children}</div>
    </div>
  );
}
