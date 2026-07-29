"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Circle,
  FileCheck2,
  KeyRound,
  LockKeyhole,
  Printer,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CasePage } from "@/components/shared/case-page";
import { SourceChip } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CitationFirewall } from "@/features/citations/citation-firewall";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { getCurrentMotionVersion, isExportUnlocked, useAppStore } from "@/stores/app-store";

const schema = z.object({
  reviewerName: z.string().trim().min(2, "Enter the reviewing attorney’s name."),
  pin: z.string().regex(/^2026$/, "Enter the demonstration PIN 2026."),
  confirmed: z.boolean().refine((value) => value, "Confirm responsibility for final legal review."),
});

type Values = z.infer<typeof schema>;

export function ReviewPage() {
  const { caseId, record } = useCaseRecord();
  const approveMotion = useAppStore((state) => state.approveMotion);
  const recordExport = useAppStore((state) => state.recordExport);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { reviewerName: "", pin: "", confirmed: false },
  });
  if (!record) return <UnknownCase />;
  const current = getCurrentMotionVersion(record);
  const ethicsApplied = record.ethicsArguments.some((argument) => argument.requiredRejection && argument.status === "rejected");
  const rejectedIncluded = record.strategies.some((strategy) => strategy.ethicsStatus === "rejected" && strategy.included);
  const citationPass = record.citations.length === 9 && record.citations.every((citation) => citation.status === "verified");
  const unlocked = isExportUnlocked(record);
  const conditions = [
    ["Motion draft exists", Boolean(record.currentMotion)],
    ["Current motion version is saved", Boolean(current)],
    ["9 of 9 synthetic citation records pass", citationPass],
    ["Required unsupported argument is rejected", ethicsApplied],
    ["No rejected strategy is included", !rejectedIncluded],
  ] as const;

  const submit = (values: Values) => {
    const result = approveMotion(caseId, values.reviewerName, values.pin, values.confirmed);
    if (!result.ok) {
      setError("root", { message: result.message });
      return;
    }
    toast.success(result.message);
  };

  const print = () => {
    if (!recordExport(caseId)) {
      toast.error("The current motion version is not approved.");
      return;
    }
    toast.success("Opening the browser print view. No court filing occurs.");
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Attorney review gate"
      description="Approval records professional responsibility for the exact saved motion version and deterministic mock hash. The demo PIN is not security."
      actions={unlocked ? <Button onClick={print}><Printer className="size-4" aria-hidden="true" /> Print or Save as PDF</Button> : undefined}
    >
      <div className={`mb-6 flex items-start gap-3 rounded-xl border p-5 ${unlocked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`} aria-live="polite">
        {unlocked ? <UserCheck className="mt-0.5 size-6 shrink-0" aria-hidden="true" /> : <LockKeyhole className="mt-0.5 size-6 shrink-0" aria-hidden="true" />}
        <div>
          <h2 className="font-serif text-xl font-semibold">{unlocked ? "Approved version — export unlocked" : "Pending attorney review — export locked"}</h2>
          <p className="mt-1 text-sm leading-6">
            {unlocked
              ? "Browser print is enabled only for the approved version. Any saved edit invalidates this approval."
              : "Complete every precondition, enter the named reviewer, use demo PIN 2026, and accept responsibility for final legal review."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Approval preconditions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {conditions.map(([label, passed]) => (
                <div key={label} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${passed ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
                  {passed ? <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> : <Circle className="size-5 shrink-0" aria-hidden="true" />}
                  <span className="font-semibold">{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Version binding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">Motion version</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-[var(--navy)]">{current?.version ?? "Not saved"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">Deterministic mock version hash</p>
                <div className="mt-2"><SourceChip>{current?.mockHash ?? "No hash"}</SourceChip></div>
                <p className="mt-2 text-xs leading-5 text-[var(--slate)]">Reproducible frontend identifier; not a cryptographic signature.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-[var(--border)]">
            <CardTitle>{unlocked ? "Approval summary" : "Record attorney approval"}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-[var(--slate)]">This gate demonstrates human responsibility; it is not production identity verification.</p>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {record.approval ? (
              <div>
                <div className="grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:grid-cols-2">
                  <Meta label="Reviewer" value={record.approval.reviewerName} />
                  <Meta label="Motion version" value={`Version ${record.approval.version}`} />
                  <Meta label="Review timestamp" value={record.approval.timestamp} />
                  <Meta label="Mock version hash" value={record.approval.mockHash} />
                </div>
                <p className="mt-5 text-sm leading-6 text-[var(--slate)]">The reviewer acknowledged responsibility for final legal review. This approval does not imply a filing occurred.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={print}><Printer className="size-4" aria-hidden="true" /> Print or Save as PDF</Button>
                  <Link href={`/cases/${caseId}/motion`} className={buttonVariants({ variant: "secondary" })}>Return to Motion Studio</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
                <div>
                  <label htmlFor="reviewerName" className="mb-2 block text-sm font-semibold text-[var(--navy)]">Reviewing attorney name</label>
                  <Input id="reviewerName" autoComplete="name" aria-invalid={Boolean(errors.reviewerName)} {...register("reviewerName")} />
                  {errors.reviewerName && <p role="alert" className="mt-2 text-sm text-[var(--red)]">{errors.reviewerName.message}</p>}
                </div>
                <div>
                  <label htmlFor="pin" className="mb-2 block text-sm font-semibold text-[var(--navy)]">Demonstration review PIN</label>
                  <Input id="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={4} aria-invalid={Boolean(errors.pin)} {...register("pin")} />
                  {errors.pin && <p role="alert" className="mt-2 text-sm text-[var(--red)]">{errors.pin.message}</p>}
                  <p className="mt-2 flex items-center gap-2 text-xs text-[var(--slate)]"><KeyRound className="size-3.5" aria-hidden="true" /> Demo PIN: 2026. It is not stored or treated as authentication.</p>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--cream)] p-4 text-sm leading-6">
                  <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--navy)]" {...register("confirmed")} />
                  <span>I accept responsibility for verifying every factual and legal proposition, the authentic record, governing law, requested relief, and any decision to file.</span>
                </label>
                {errors.confirmed && <p role="alert" className="text-sm text-[var(--red)]">{errors.confirmed.message}</p>}
                {errors.root && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errors.root.message}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting || conditions.some(([, passed]) => !passed)}>
                  <FileCheck2 className="size-4" aria-hidden="true" /> {isSubmitting ? "Recording approval…" : "Approve current motion version"}
                </Button>
                {conditions.some(([, passed]) => !passed) && <p className="text-center text-xs text-[var(--slate)]">Complete every precondition before approval.</p>}
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 no-print">
        <CitationFirewall record={record} compact />
      </div>

      <article className="print-motion legal-document hidden whitespace-pre-wrap bg-white text-black print:block">
        <header className="mb-8 border-b border-black pb-5 text-center">
          <p className="text-sm font-bold">LEGALBRIDGE INDIA · SYNTHETIC HACKATHON OUTPUT</p>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-emerald-950">{value}</p>
    </div>
  );
}
