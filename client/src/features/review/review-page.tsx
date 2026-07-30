"use client";

import { FileCheck2, KeyRound, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

type Decision = "changes_requested" | "approved" | "rejected";

export function ReviewPage() {
  const { caseId, record } = useCaseRecord();
  const summary = useAppStore((state) => state.analysisSummaries[caseId]);
  const reviewMotion = useAppStore((state) => state.reviewPersistentMotion);
  const motion = summary?.motions[0];
  const [decision, setDecision] = useState<Decision>("approved");
  const [comments, setComments] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!record) return <UnknownCase />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!motion || comments.trim().length < 3 || pin.length < 4) return;
    setSubmitting(true);
    try {
      await reviewMotion(
        caseId,
        motion.id,
        decision,
        comments.trim(),
        pin,
      );
      setComments("");
      setPin("");
      toast.success("Internal demonstration review persisted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Attorney review"
      description="Review decisions are verified by the backend and bound to the current persisted motion version."
    >
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-5 text-amber-950">
          <LockKeyhole className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Internal demonstration approval — not a court signature.
            </p>
            <p className="mt-1 text-sm leading-6">
              Attorney verification is required. Approval does not file anything
              and no automatic court-filing action exists.
            </p>
          </div>
        </CardContent>
      </Card>

      {!motion ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--slate)]">
            No motion is available for review. Run analysis first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Review history</CardTitle>
              <div className="mt-2">
                <StatusBadge status={motion.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {motion.reviews.map((review) => (
                <article key={review.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={review.decision} />
                    <span className="text-xs text-[var(--slate)]">
                      {new Date(
                        review.reviewed_at ?? review.created_at,
                      ).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6">{review.comments}</p>
                  <dl className="mt-3 grid gap-2 text-xs text-[var(--slate)] sm:grid-cols-2">
                    <div><dt className="font-semibold">Motion version</dt><dd>v{motion.current_version}</dd></div>
                    <div><dt className="font-semibold">Reviewer</dt><dd>{review.reviewer_name}</dd></div>
                    <div><dt className="font-semibold">Reviewer role</dt><dd className="capitalize">{review.reviewer_role}</dd></div>
                    <div><dt className="font-semibold">PIN verified</dt><dd>{review.review_pin_verified ? "Yes" : "No"}</dd></div>
                  </dl>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record review decision</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Decision</span>
                  <select
                    value={decision}
                    onChange={(event) => setDecision(event.target.value as Decision)}
                    className="min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm"
                  >
                    <option value="approved">Approve internally</option>
                    <option value="changes_requested">Request changes</option>
                    <option value="rejected">Reject</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Comments</span>
                  <Textarea
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    rows={5}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <KeyRound className="size-4" aria-hidden="true" /> Review PIN
                  </span>
                  <Input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    autoComplete="off"
                    required
                  />
                  <span className="mt-2 block text-xs text-[var(--slate)]">
                    The backend validates the development PIN; it is not a digital
                    signature.
                  </span>
                </label>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    submitting || comments.trim().length < 3 || pin.length < 4
                  }
                >
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  {submitting ? "Recording…" : "Record internal review"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </CasePage>
  );
}
