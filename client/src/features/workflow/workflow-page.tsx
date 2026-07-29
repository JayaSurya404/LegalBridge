"use client";

import { Play, RefreshCcw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import type { WorkflowNode } from "@/lib/types/domain";
import { useAppStore } from "@/stores/app-store";

export function WorkflowPage() {
  const { caseId, record } = useCaseRecord();
  const runAnalysis = useAppStore((state) => state.runPersistentAnalysis);
  const summary = useAppStore((state) => state.analysisSummaries[caseId]);
  const [running, setRunning] = useState(false);
  const [inspected, setInspected] = useState<WorkflowNode | null>(null);

  if (!record) return <UnknownCase />;
  const completed = record.workflow.nodes.filter(
    (node) => node.status === "completed",
  ).length;
  const total = record.workflow.nodes.length || 13;
  const progress = Math.round((completed / total) * 100);

  const start = async () => {
    setRunning(true);
    try {
      await runAnalysis(caseId);
      toast.success("Database-backed analysis completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Database-backed analysis workflow"
      description="Thirteen deterministic agents use stored source pages. Statuses and results are persisted by FastAPI in Supabase."
      actions={
        <Button
          onClick={start}
          disabled={running || record.documents.length === 0}
        >
          {running ? (
            <RefreshCcw className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          {summary?.analysis_run?.status === "failed"
            ? "Retry analysis"
            : "Run analysis"}
        </Button>
      }
    >
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-5 text-sm leading-6 text-blue-950">
          Synthetic demonstration data · Not legal advice · Attorney verification
          required · No automatic court filing.
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <StatusBadge status={record.workflow.status} />
              <p className="mt-2 text-sm font-semibold text-[var(--navy)]">
                {completed} of {total} agents completed
              </p>
              <p className="mt-1 text-xs text-[var(--slate)]">
                {summary?.analysis_run?.summary ??
                  "Analysis pending. No backend findings are shown."}
              </p>
            </div>
            <span className="font-serif text-3xl font-semibold text-[var(--navy)]">
              {progress}%
            </span>
          </div>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Workflow progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-[var(--green)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {record.workflow.nodes.map((node, index) => {
          const backendAgent = summary?.agents[index];
          return (
            <Card key={node.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-[var(--navy)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-[var(--navy)]">
                        {node.name}
                      </h2>
                      <StatusBadge status={node.status} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--slate)]">
                      {node.output}
                    </p>
                    {backendAgent?.completed_at && (
                      <p className="mt-2 text-xs text-[var(--slate)]">
                        Completed {new Date(backendAgent.completed_at).toLocaleString()}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 px-0"
                      onClick={() => setInspected(node)}
                    >
                      <Search className="size-4" aria-hidden="true" /> Inspect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(inspected)}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
      >
        <DialogContent>
          {inspected && (
            <>
              <DialogTitle>{inspected.name}</DialogTitle>
              <DialogDescription>{inspected.description}</DialogDescription>
              <div className="mt-4 space-y-4 text-sm">
                <Detail label="Input">{inspected.input}</Detail>
                <Detail label="Persisted output">{inspected.output}</Detail>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CasePage>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">
        {label}
      </p>
      <div className="mt-2 leading-6">{children}</div>
    </div>
  );
}
