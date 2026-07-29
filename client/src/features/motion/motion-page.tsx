"use client";

import {
  CheckCircle2,
  FileLock2,
  History,
  Link2,
  Printer,
  Save,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { SourceChip, StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CitationFirewall } from "@/features/citations/citation-firewall";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { getMotionGateStatus } from "@/lib/motion-gate";
import { useAppStore } from "@/stores/app-store";

export function MotionPage() {
  const { caseId, record } = useCaseRecord();
  const saveMotion = useAppStore((state) => state.saveMotion);
  const recordExport = useAppStore((state) => state.recordExport);
  const [body, setBody] = useState(record?.currentMotion ?? "");

  if (!record) return <UnknownCase />;
  const gate = getMotionGateStatus(record);
  const currentVersion = gate.currentVersion;
  const dirty = body.trim() !== record.currentMotion.trim();
  const unlocked = gate.exportUnlocked;

  const print = () => {
    if (!recordExport(caseId)) {
      toast.error("Export remains locked because the current version lacks valid approval.");
      return;
    }
    toast.success("Opening the approved browser print view. Nothing is automatically filed.");
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Motion Studio"
      description="Edit the synthetic motion draft, inspect source support, and test approval invalidation. The document is not reviewed for filing."
      actions={
        <>
          <Button
            variant="secondary"
            disabled={!dirty || body.trim().length < 80}
            onClick={() => {
              saveMotion(caseId, body);
              toast.success(record.approval ? "Motion saved; approval revoked and export locked." : "Motion saved as a new local version.");
            }}
          >
            <Save className="size-4" aria-hidden="true" /> Save local version
          </Button>
          <Button disabled={!unlocked} onClick={print} title={unlocked ? "Print approved version" : "Attorney approval required"}>
            <Printer className="size-4" aria-hidden="true" /> Print or Save as PDF
          </Button>
        </>
      }
    >
      <div className={`mb-5 flex items-start gap-3 rounded-xl border p-4 ${unlocked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`} aria-live="polite">
        {unlocked ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <FileLock2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
        <div>
          <p className="font-semibold">{unlocked ? `Export unlocked for approved version ${record.approval?.version}` : "Export locked"}</p>
          <p className="mt-1 text-sm leading-6">
            {unlocked
              ? `Approval is bound to ${record.approval?.mockHash}. Editing and saving will revoke it immediately.`
              : record.approval
                ? "The stored approval no longer satisfies the current motion, citation, and ethics gate. A new attorney review is required."
                : "A named attorney must approve the current version after the Citation Firewall and ethics gate pass."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.25fr_.75fr]">
        <Card className="no-print overflow-hidden">
          <CardHeader className="border-b border-[var(--border)] bg-[var(--cream)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">Editable motion draft</CardTitle>
                <p className="mt-1 text-xs text-[var(--slate)]">Version {currentVersion?.version ?? 0} · {currentVersion?.mockHash ?? "No saved hash"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={dirty ? "unsaved changes" : "saved"} />
                <StatusBadge status={unlocked ? "approved" : record.approval ? "invalidated" : "pending"} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-center text-xs font-bold tracking-[0.18em] text-red-800">
              DRAFT — NOT REVIEWED FOR FILING
            </div>
            <Textarea
              aria-label="Editable synthetic motion draft"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="legal-document watermark min-h-[52rem] resize-y rounded-none border-0 p-6 text-[15px] leading-8 focus:ring-2 focus:ring-inset"
            />
          </CardContent>
        </Card>

        <div className="space-y-5 no-print">
          <Card>
            <CardHeader><CardTitle>Motion sections</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {["Purpose and limits", "Custody chronology", "Seizure sequence", "Witness accounts", "Requested attorney action"].map((section, index) => (
                  <li key={section} className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3">
                    <span className="grid size-7 place-items-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">{index + 1}</span>
                    <span className="font-semibold text-[var(--navy)]">{section}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fact-source Inspector</CardTitle>
              <p className="mt-1 text-sm text-[var(--slate)]">Selected source-linked observations used in the draft.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {record.timeline.slice(1, 5).map((event) => (
                <article key={event.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-start gap-2">
                    <Link2 className="mt-0.5 size-4 shrink-0 text-[var(--green)]" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--navy)]">{event.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--slate)]">{event.excerpt}</p>
                      <div className="mt-2"><SourceChip>{event.source}</SourceChip></div>
                    </div>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Revision history</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {record.motionVersions.toReversed().map((version) => (
                <div key={`${version.version}-${version.mockHash}`} className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3">
                  <History className="mt-0.5 size-4 shrink-0 text-[var(--saffron-dark)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">Version {version.version}</p>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--slate)]">{version.mockHash}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 no-print">
        <CitationFirewall record={record} compact />
      </div>

      {!unlocked && (
        <Card className="no-print mt-6 border-red-200">
          <CardContent className="flex items-start gap-3 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[var(--red)]" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-[var(--navy)]">Print/export remains locked</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--slate)]">
                {gate.exportBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <article className="print-motion legal-document hidden whitespace-pre-wrap bg-white text-black print:block">
        <header className="mb-8 border-b border-black pb-5 text-center">
          <p className="text-sm font-bold">LEGALBRIDGE INDIA · SYNTHETIC HACKATHON OUTPUT</p>
          <p className="mt-2 text-sm font-bold">DRAFT — NOT REVIEWED FOR FILING</p>
          <p className="mt-2 text-xs">Not automatically filed · Attorney verification remains required</p>
        </header>
        {record.currentMotion}
        {record.approval && (
          <footer className="mt-10 border-t border-black pt-5 text-xs leading-6">
            <p><strong>Reviewed by:</strong> {record.approval.reviewerName}</p>
            <p><strong>Motion version:</strong> {record.approval.version}</p>
            <p><strong>Mock version hash:</strong> {record.approval.mockHash}</p>
            <p><strong>Approval timestamp:</strong> {record.approval.timestamp}</p>
          </footer>
        )}
      </article>
    </CasePage>
  );
}
