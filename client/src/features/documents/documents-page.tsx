"use client";

import {
  FileCheck2,
  FilePlus2,
  FileText,
  LoaderCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import type { DocumentMeta } from "@/lib/types/domain";
import { useAppStore } from "@/stores/app-store";

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 12;
const accepted: Record<string, DocumentMeta["type"]> = {
  ".pdf": "PDF",
  ".txt": "TXT",
  ".docx": "DOCX",
};

type PendingDocument = Omit<DocumentMeta, "id" | "addedAt">;

function safeName(value: string) {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .slice(0, 180);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { caseId, record } = useCaseRecord();
  const addDocuments = useAppStore((state) => state.addDocuments);
  const processDocuments = useAppStore((state) => state.processDocuments);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingDocument[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  if (!record) return <UnknownCase />;

  const selectFiles = (fileList: FileList | File[]) => {
    const next: PendingDocument[] = [];
    const errors: string[] = [];
    const known = new Set([
      ...record.documents.map((document) => document.name.toLowerCase()),
      ...pending.map((document) => document.name.toLowerCase()),
    ]);
    const available = Math.max(0, MAX_FILES - record.documents.length - pending.length);
    Array.from(fileList)
      .slice(0, available)
      .forEach((file) => {
        const name = safeName(file.name);
        const extension = name.includes(".")
          ? `.${name.split(".").pop()?.toLowerCase()}`
          : "";
        const type = accepted[extension];
        if (!type) {
          errors.push(`${name || "Unnamed file"}: only PDF, TXT, and DOCX are accepted.`);
          return;
        }
        if (file.size === 0) {
          errors.push(`${name}: empty files are not accepted.`);
          return;
        }
        if (file.size > MAX_SIZE) {
          errors.push(`${name}: exceeds the 10 MB frontend-only limit.`);
          return;
        }
        if (known.has(name.toLowerCase())) {
          errors.push(`${name}: duplicate file metadata was not added.`);
          return;
        }
        known.add(name.toLowerCase());
        next.push({
          name,
          type,
          mimeType: file.type || {
            PDF: "application/pdf",
            TXT: "text/plain",
            DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }[type],
          size: file.size,
          status: "selected",
          sourceLabel: `Local selection · ${type}`,
        });
      });
    if (Array.from(fileList).length > available) {
      errors.push(`Only ${available} more file${available === 1 ? "" : "s"} can be selected; the frontend limit is ${MAX_FILES}.`);
    }
    setPending((current) => [...current, ...next]);
    setMessages(errors);
    if (next.length) toast.success(`${next.length} file metadata record${next.length === 1 ? "" : "s"} ready to add.`);
  };

  const commit = () => {
    const count = addDocuments(caseId, pending);
    setPending([]);
    setMessages([]);
    toast.success(`${count} browser-local document record${count === 1 ? "" : "s"} added.`);
  };

  const unprocessed = record.documents.some((document) => document.status !== "processed");

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Documents"
      description="Select source files for frontend validation and simulated processing. Binary contents are never uploaded or persisted."
      actions={unprocessed ? <Button onClick={() => { processDocuments(caseId); toast.success("Deterministic document processing completed."); }}><LoaderCircle className="size-4" aria-hidden="true" /> Simulate processing</Button> : undefined}
    >
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select source files</CardTitle>
            <p className="mt-1 text-sm leading-6 text-[var(--slate)]">PDF, TXT, or DOCX · 10 MB each · {MAX_FILES} records maximum.</p>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
              onDrop={(event) => { event.preventDefault(); setDragging(false); selectFiles(event.dataTransfer.files); }}
              className={`rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${dragging ? "border-[var(--saffron)] bg-amber-50" : "border-[var(--border-strong)] bg-[var(--cream)]"}`}
            >
              <UploadCloud className="mx-auto size-9 text-[var(--saffron-dark)]" aria-hidden="true" />
              <p className="mt-3 font-semibold text-[var(--navy)]">Drop accessible file selections here</p>
              <p className="mt-1 text-xs leading-5 text-[var(--slate)]">or use the browser file picker</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) selectFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <Button type="button" variant="secondary" className="mt-4" onClick={() => inputRef.current?.click()}>
                <FilePlus2 className="size-4" aria-hidden="true" /> Choose files
              </Button>
            </div>
            <div className="mt-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-950">
              <p>Files remain in this browser session.</p>
              <p>No backend upload occurs.</p>
              <p>Processing shown here is simulated.</p>
            </div>
            {messages.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                <p className="text-sm font-semibold text-red-900">Some files were not selected</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-red-800">
                  {messages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              </div>
            )}
            {pending.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[var(--navy)]">Ready to add</h3>
                <div className="mt-2 space-y-2">
                  {pending.map((document) => (
                    <div key={document.name} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{document.name}</p>
                        <p className="text-xs text-[var(--slate)]">{document.type} · {formatBytes(document.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setPending((current) => current.filter((item) => item.name !== document.name))} aria-label={`Remove ${document.name}`}>
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full" onClick={commit}>Add {pending.length} metadata record{pending.length === 1 ? "" : "s"}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source metadata records</CardTitle>
            <p className="mt-1 text-sm text-[var(--slate)]">{record.documents.length} document{record.documents.length === 1 ? "" : "s"} in this case.</p>
          </CardHeader>
          <CardContent>
            {record.documents.length === 0 ? (
              <EmptyState title="No uploaded documents" description="Select a PDF, TXT, or DOCX file to validate its metadata. No backend upload will occur." action={<Button onClick={() => inputRef.current?.click()}>Choose files</Button>} />
            ) : (
              <div className="space-y-3">
                {record.documents.map((document) => (
                  <article key={document.id} className="density-card rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--cream)] text-[var(--saffron-dark)]">
                        {document.status === "processed" ? <FileCheck2 className="size-5" aria-hidden="true" /> : <FileText className="size-5" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-all text-sm font-semibold text-[var(--navy)]">{document.name}</h3>
                            <p className="mt-1 text-xs text-[var(--slate)]">{document.sourceLabel}</p>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                          <div><dt className="text-[var(--slate)]">Type</dt><dd className="mt-1 font-semibold">{document.type}</dd></div>
                          <div><dt className="text-[var(--slate)]">Size</dt><dd className="mt-1 font-semibold">{formatBytes(document.size)}</dd></div>
                          <div><dt className="text-[var(--slate)]">Pages</dt><dd className="mt-1 font-semibold">{document.pages ?? "Not parsed"}</dd></div>
                          <div><dt className="text-[var(--slate)]">Storage</dt><dd className="mt-1 font-semibold">Metadata only</dd></div>
                        </dl>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CasePage>
  );
}
