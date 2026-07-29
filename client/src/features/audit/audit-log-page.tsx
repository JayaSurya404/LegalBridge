"use client";

import { Filter, History, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CasePage } from "@/components/shared/case-page";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackendApiError } from "@/lib/api/client";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

export function AuditLogPage() {
  const { caseId, record } = useCaseRecord();
  const events = useAppStore((state) => state.auditEvents);
  const syncAuditEvents = useAppStore((state) => state.syncAuditEvents);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await syncAuditEvents(caseId);
    } catch (caught) {
      setError(
        caught instanceof BackendApiError
          ? `${caught.message}${caught.requestId ? ` Request ID: ${caught.requestId}.` : ""}`
          : "Backend audit events could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [caseId, syncAuditEvents]);

  useEffect(() => {
    let active = true;
    void syncAuditEvents(caseId)
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof BackendApiError
            ? `${caught.message}${caught.requestId ? ` Request ID: ${caught.requestId}.` : ""}`
            : "Backend audit events could not be loaded.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, syncAuditEvents]);

  const caseEvents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return events
      .filter(
        (event) =>
          event.caseId === caseId &&
          (type === "all" || event.type.startsWith(type)) &&
          (!search ||
            event.message.toLowerCase().includes(search) ||
            event.actor.toLowerCase().includes(search) ||
            event.relatedEntity.toLowerCase().includes(search)),
      )
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() -
          new Date(left.timestamp).getTime(),
      );
  }, [caseId, events, query, type]);
  if (!record) return <UnknownCase />;

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Audit history"
      description="Backend authentication, case, and document events are authoritative. Closed synthetic workflow events remain clearly labelled for the demonstration case."
      actions={
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => void refresh()}
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh audit
        </Button>
      }
    >
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}
      <Card className="mb-5">
        <CardContent className="grid gap-3 pt-5 md:grid-cols-[1fr_15rem]">
          <label className="relative">
            <span className="sr-only">Search audit events</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--slate)]" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, actor, or related entity" className="pl-10" />
          </label>
          <label className="relative">
            <span className="sr-only">Filter audit event type</span>
            <Filter className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--slate)]" aria-hidden="true" />
            <select value={type} onChange={(event) => setType(event.target.value)} className="min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]">
              <option value="all">All event types</option>
              <option value="case">Cases</option>
              <option value="document">Documents and extraction</option>
              <option value="successful">Authentication</option>
              <option value="workflow">Workflow</option>
              <option value="analysis">Analysis findings</option>
              <option value="documents">Documents</option>
              <option value="ethics">Ethics</option>
              <option value="motion">Motion</option>
              <option value="approval">Approval</option>
              <option value="export">Export</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {caseEvents.length === 0 ? (
        <EmptyState title="No audit events match this view" description="Clear the filters or complete a frontend demonstration action." />
      ) : (
        <ol className="space-y-3">
          {caseEvents.map((event) => (
            <li key={event.id}>
              <Card>
                <CardContent className="density-card flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-[var(--saffron-dark)]">
                    <History className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold leading-6 text-[var(--navy)]">{event.message}</p>
                        <p className="mt-1 break-all font-mono text-xs text-[var(--slate)]">{event.id}</p>
                      </div>
                      <StatusBadge status={event.type.replaceAll(".", " ")} />
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <Meta label="Timestamp" value={format(new Date(event.timestamp), "dd MMM yyyy, HH:mm:ss")} />
                      <Meta label="Actor" value={event.actor} />
                      <Meta
                        label="Source"
                        value={
                          event.source === "backend"
                            ? "Backend authoritative"
                            : "Synthetic/local demonstration"
                        }
                      />
                      <Meta label="Related entity" value={event.relatedEntity} />
                      <Meta label="Metadata" value={event.metadata} />
                    </dl>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </CasePage>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold uppercase tracking-wider text-[var(--slate)]">{label}</dt>
      <dd className="mt-1 break-words leading-5 text-[var(--ink)]">{value}</dd>
    </div>
  );
}
