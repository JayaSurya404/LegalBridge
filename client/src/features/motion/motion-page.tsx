"use client";

import {
  Download,
  FileCheck2,
  History,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CasePage } from "@/components/shared/case-page";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import { useAppStore } from "@/stores/app-store";

export function MotionPage() {
  const { caseId, record } = useCaseRecord();

  const summary = useAppStore(
    (state) => state.analysisSummaries[caseId],
  );

  const saveVersion = useAppStore(
    (state) => state.savePersistentMotion,
  );

  const runAction = useAppStore(
    (state) => state.runPersistentMotionAction,
  );

  const exportMotion = useAppStore(
    (state) => state.exportPersistentMotion,
  );

  const motion = summary?.motions[0];
  const current = motion?.versions.at(-1);

  const [draftBodies, setDraftBodies] = useState<
    Record<string, string>
  >({});

  const [busy, setBusy] = useState(false);

  const body = current
    ? draftBodies[current.id] ??
      current.rendered_text ??
      ""
    : "";

  const updateBody = (value: string) => {
    if (!current) {
      return;
    }

    setDraftBodies((previous) => ({
      ...previous,
      [current.id]: value,
    }));
  };

  if (!record) {
    return <UnknownCase />;
  }

  const perform = async (
    action:
      | "citation-check"
      | "ethics-check"
      | "submit-review",
  ) => {
    if (!motion) {
      return;
    }

    setBusy(true);

    try {
      await runAction(caseId, motion.id, action);

      toast.success(
        `${action.replaceAll("-", " ")} completed.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Action failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!motion) {
      return;
    }

    setBusy(true);

    try {
      await saveVersion(caseId, motion.id, body);

      toast.success(
        "New database-backed motion version saved; approval invalidated.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Save failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const download = async (
    format: "pdf" | "docx",
  ) => {
    if (!motion) {
      return;
    }

    try {
      const blob = await exportMotion(
        caseId,
        motion.id,
        format,
      );

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        `legalbridge-demonstration.${format}`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      toast.success(
        `${format.toUpperCase()} export downloaded. No court filing occurred.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Export failed.",
      );
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Motion Studio"
      description="Database-backed, source-grounded drafting with versioning, Citation Firewall, Ethics Auditor, and authenticated exports."
      actions={
        <>
          <Button
            variant="secondary"
            disabled={busy || !motion}
            onClick={save}
          >
            <Save
              className="size-4"
              aria-hidden="true"
            />
            Save version
          </Button>

          <Button
            variant="secondary"
            disabled={busy || !motion}
            onClick={() => download("pdf")}
          >
            <Download
              className="size-4"
              aria-hidden="true"
            />
            PDF
          </Button>

          <Button
            disabled={busy || !motion}
            onClick={() => download("docx")}
          >
            <Download
              className="size-4"
              aria-hidden="true"
            />
            DOCX
          </Button>
        </>
      }
    >
      <Card className="mb-5 border-red-200 bg-red-50">
        <CardContent className="p-4 text-sm leading-6 text-red-950">
          Demonstration draft — attorney review
          required — not filed with any court.
          Synthetic demonstration data; not legal
          advice; no automatic court filing.
        </CardContent>
      </Card>

      {!motion ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--slate)]">
            No motion exists. Run the
            database-backed analysis first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
          <Card>
            <CardHeader className="border-b border-[var(--border)]">
              <CardTitle>{motion.title}</CardTitle>

              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={motion.status} />

                <StatusBadge
                  status={
                    current?.citation_check_status ??
                    "pending"
                  }
                />

                <StatusBadge
                  status={
                    current?.ethics_check_status ??
                    "pending"
                  }
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Textarea
                aria-label="Editable demonstration motion"
                value={body}
                onChange={(event) =>
                  updateBody(event.target.value)
                }
                className="legal-document min-h-[52rem] resize-y rounded-none border-0 p-6 text-[15px] leading-8"
              />
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>
                  Checks and review
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    perform("citation-check")
                  }
                >
                  <ShieldCheck
                    className="size-4"
                    aria-hidden="true"
                  />
                  Run Citation Firewall
                </Button>

                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    perform("ethics-check")
                  }
                >
                  <FileCheck2
                    className="size-4"
                    aria-hidden="true"
                  />
                  Run Ethics Auditor
                </Button>

                <Button
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    perform("submit-review")
                  }
                >
                  Submit for attorney review
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Version history
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {motion.versions
                  .toReversed()
                  .map((version) => (
                    <div
                      key={version.id}
                      className="flex gap-3 rounded-xl border p-3"
                    >
                      <History className="mt-0.5 size-4 text-[var(--saffron-dark)]" />

                      <div>
                        <p className="text-sm font-semibold">
                          Version{" "}
                          {version.version_number}
                        </p>

                        <p className="mt-1 text-xs text-[var(--slate)]">
                          {new Date(
                            version.created_at,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </CasePage>
  );
}