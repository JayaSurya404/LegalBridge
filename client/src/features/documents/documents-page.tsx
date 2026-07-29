"use client";

import {
  FileCheck2,
  FilePlus2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CasePage } from "@/components/shared/case-page";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status";
import { UnknownCase } from "@/components/shared/unknown-case";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendApiError } from "@/lib/api/client";
import { useCaseRecord } from "@/lib/hooks/use-case-record";
import type { DocumentMeta } from "@/lib/types/domain";
import { useAppStore } from "@/stores/app-store";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 12;
const accepted: Record<string, DocumentMeta["type"]> = {
  ".pdf": "PDF",
  ".txt": "TXT",
  ".docx": "DOCX",
};
const acceptedMimeTypes: Record<DocumentMeta["type"], string> = {
  PDF: "application/pdf",
  TXT: "text/plain",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const categories = [
  ["evidence", "Evidence"],
  ["pleading", "Pleading"],
  ["correspondence", "Correspondence"],
  ["order", "Order"],
  ["other", "Other"],
] as const;

interface PendingDocument {
  file: File;
  name: string;
  type: DocumentMeta["type"];
  mimeType: string;
  size: number;
  category: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSafeFilename(value: string) {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !value.includes("/") &&
    !value.includes("\\") &&
    value !== "." &&
    value !== ".." &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  );
}

async function sha256(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function apiErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    return `${error.message}${error.requestId ? ` Request ID: ${error.requestId}.` : ""}`;
  }
  return "The metadata request failed. Confirm the backend is available and retry.";
}

export function DocumentsPage() {
  const { caseId, record } = useCaseRecord();
  const syncDocuments = useAppStore((state) => state.syncDocuments);
  const registerDocumentMetadata = useAppStore(
    (state) => state.registerDocumentMetadata,
  );
  const deleteDocumentMetadata = useAppStore(
    (state) => state.deleteDocumentMetadata,
  );
  const syncAuditEvents = useAppStore((state) => state.syncAuditEvents);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingDocument[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState("");
  const [progress, setProgress] = useState(0);
  const [category, setCategory] = useState("evidence");

  useEffect(() => {
    let active = true;
    void syncDocuments(caseId)
      .catch((error: unknown) => {
        if (active) setMessages([apiErrorMessage(error)]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, syncDocuments]);

  if (!record) return <UnknownCase />;

  const persistedDocuments = record.documents.filter(
    (document) => document.origin !== "synthetic_fixture",
  );
  const fixtureDocuments = record.documents.filter(
    (document) => document.origin === "synthetic_fixture",
  );

  const selectFiles = (fileList: FileList | File[]) => {
    const next: PendingDocument[] = [];
    const errors: string[] = [];
    const known = new Set([
      ...persistedDocuments.map((document) => document.name.toLowerCase()),
      ...pending.map((document) => document.name.toLowerCase()),
    ]);
    const available = Math.max(
      0,
      MAX_FILES - persistedDocuments.length - pending.length,
    );
    let capacityMessageAdded = false;

    for (const file of Array.from(fileList)) {
      const name = file.name.trim();
      if (!isSafeFilename(name) || name !== file.name) {
        errors.push(
          `${file.name || "Unnamed file"}: filename is empty, unsafe, or too long.`,
        );
        continue;
      }
      const extension = name.includes(".")
        ? `.${name.split(".").at(-1)?.toLowerCase()}`
        : "";
      const type = accepted[extension];
      if (!type) {
        errors.push(`${name}: only PDF, TXT, and DOCX are accepted.`);
        continue;
      }
      const expectedMime = acceptedMimeTypes[type];
      if (file.type.toLowerCase() !== expectedMime) {
        errors.push(
          `${name}: filename extension and browser-reported MIME type do not match.`,
        );
        continue;
      }
      if (file.size === 0) {
        errors.push(`${name}: empty files are not accepted.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${name}: exceeds the 50 MB metadata limit.`);
        continue;
      }
      if (known.has(name.toLowerCase())) {
        errors.push(`${name}: duplicate filename metadata was not selected.`);
        continue;
      }
      if (next.length >= available) {
        if (!capacityMessageAdded) {
          errors.push(
            `Only ${available} more record${available === 1 ? "" : "s"} can be registered; the case limit is ${MAX_FILES}.`,
          );
          capacityMessageAdded = true;
        }
        continue;
      }
      known.add(name.toLowerCase());
      next.push({
        file,
        name,
        type,
        mimeType: expectedMime,
        size: file.size,
        category,
      });
    }
    setPending((current) => [...current, ...next]);
    setMessages(errors);
    if (next.length) {
      toast.success(
        `${next.length} file${next.length === 1 ? "" : "s"} ready for hashing.`,
      );
    }
  };

  const registerPending = async () => {
    setRegistering(true);
    setMessages([]);
    const errors: string[] = [];
    let completed = 0;
    for (const [index, document] of pending.entries()) {
      setActiveName(document.name);
      setProgress(Math.round((index / pending.length) * 100));
      try {
        setProgress(Math.round(((index + 0.25) / pending.length) * 100));
        const hash = await sha256(document.file);
        setProgress(Math.round(((index + 0.7) / pending.length) * 100));
        await registerDocumentMetadata(caseId, {
          original_filename: document.name,
          content_type: document.mimeType,
          size_bytes: document.size,
          sha256: hash,
          category: document.category,
        });
        completed += 1;
        setProgress(Math.round(((index + 1) / pending.length) * 100));
      } catch (error) {
        errors.push(`${document.name}: ${apiErrorMessage(error)}`);
      }
    }
    setPending([]);
    setActiveName("");
    setRegistering(false);
    setMessages(errors);
    if (completed > 0) {
      try {
        await syncDocuments(caseId);
        await syncAuditEvents(caseId);
      } catch (error) {
        setMessages((current) => [
          ...current,
          `Metadata was persisted, but refresh failed: ${apiErrorMessage(error)}`,
        ]);
      }
      toast.success(
        `${completed} metadata record${completed === 1 ? "" : "s"} persisted. File bytes were discarded.`,
      );
    }
  };

  const removeDocument = async (document: DocumentMeta) => {
    setDeletingId(document.id);
    try {
      await deleteDocumentMetadata(caseId, document.id);
      await syncAuditEvents(caseId);
      toast.success("Backend document metadata deleted.");
    } catch (error) {
      setMessages([`${document.name}: ${apiErrorMessage(error)}`]);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Document metadata"
      description="Validate files locally, calculate SHA-256 with browser Web Crypto, and persist metadata only. Binary contents never leave the browser."
      actions={
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void syncDocuments(caseId)
              .catch((error: unknown) =>
                setMessages([apiErrorMessage(error)]),
              )
              .finally(() => setLoading(false));
          }}
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh metadata
        </Button>
      }
    >
      {registering && (
        <div
          className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>Hashing and registering {activeName}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
            role="progressbar"
            aria-label="Document metadata registration progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-blue-700 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-5">
            Web Crypto reads the selected file locally. Only filename, MIME type,
            size, SHA-256, and category are sent to FastAPI.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select source files</CardTitle>
            <p className="mt-1 text-sm leading-6 text-[var(--slate)]">
              PDF, TXT, or DOCX · 50 MB each · {MAX_FILES} persisted records
              maximum.
            </p>
          </CardHeader>
          <CardContent>
            <label className="mb-4 block text-sm font-semibold text-[var(--navy)]">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                selectFiles(event.dataTransfer.files);
              }}
              className={`rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${
                dragging
                  ? "border-[var(--saffron)] bg-amber-50"
                  : "border-[var(--border-strong)] bg-[var(--cream)]"
              }`}
            >
              <UploadCloud
                className="mx-auto size-9 text-[var(--saffron-dark)]"
                aria-hidden="true"
              />
              <p className="mt-3 font-semibold text-[var(--navy)]">
                Drop file selections here
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--slate)]">
                or use the browser file picker
              </p>
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
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                disabled={registering}
                onClick={() => inputRef.current?.click()}
              >
                <FilePlus2 className="size-4" aria-hidden="true" /> Choose files
              </Button>
            </div>
            <div className="mt-4 space-y-1 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-950">
              <p>Binary contents are not uploaded or persisted.</p>
              <p>No parsing, OCR, transcription, or AI analysis occurs.</p>
              <p>The File object is discarded after hashing and registration.</p>
            </div>
            {messages.length > 0 && (
              <div
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
                role="alert"
              >
                <p className="text-sm font-semibold text-red-900">
                  Some metadata operations were not completed
                </p>
                <ul className="mt-2 list-disc space-y-1 break-all pl-5 text-xs leading-5 text-red-800">
                  {messages.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            {pending.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[var(--navy)]">
                  Ready to hash and register
                </h3>
                <div className="mt-2 space-y-2">
                  {pending.map((document) => (
                    <div
                      key={document.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {document.name}
                        </p>
                        <p className="text-xs text-[var(--slate)]">
                          {document.type} · {formatBytes(document.size)} ·{" "}
                          {document.category}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={registering}
                        onClick={() =>
                          setPending((current) =>
                            current.filter(
                              (item) => item.name !== document.name,
                            ),
                          )
                        }
                        aria-label={`Remove ${document.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={registering}
                  onClick={() => void registerPending()}
                >
                  {registering ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileCheck2 className="size-4" aria-hidden="true" />
                  )}
                  Register {pending.length} metadata record
                  {pending.length === 1 ? "" : "s"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persisted metadata records</CardTitle>
            <p className="mt-1 text-sm text-[var(--slate)]">
              {persistedDocuments.length} backend record
              {persistedDocuments.length === 1 ? "" : "s"} in this case.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-[var(--slate)]">
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Loading backend metadata…
              </p>
            ) : persistedDocuments.length === 0 ? (
              <EmptyState
                title="No persisted document metadata"
                description="Select a PDF, TXT, or DOCX file to hash locally and register metadata with FastAPI."
                action={
                  <Button onClick={() => inputRef.current?.click()}>
                    Choose files
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {persistedDocuments.map((document) => (
                  <article
                    key={document.id}
                    className="density-card rounded-xl border border-[var(--border)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--cream)] text-[var(--saffron-dark)]">
                        <FileText className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-all text-sm font-semibold text-[var(--navy)]">
                              {document.name}
                            </h3>
                            <p className="mt-1 text-xs text-[var(--slate)]">
                              {document.sourceLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status="metadata only" />
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deletingId === document.id}
                              onClick={() => void removeDocument(document)}
                              aria-label={`Delete metadata for ${document.name}`}
                            >
                              {deletingId === document.id ? (
                                <LoaderCircle
                                  className="size-4 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2
                                  className="size-4"
                                  aria-hidden="true"
                                />
                              )}
                            </Button>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                          <div>
                            <dt className="text-[var(--slate)]">Type</dt>
                            <dd className="mt-1 font-semibold">
                              {document.type}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--slate)]">Size</dt>
                            <dd className="mt-1 font-semibold">
                              {formatBytes(document.size)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--slate)]">Category</dt>
                            <dd className="mt-1 font-semibold">
                              {document.category ?? "Other"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[var(--slate)]">SHA-256</dt>
                            <dd
                              className="mt-1 truncate font-mono font-semibold"
                              title={document.sha256}
                            >
                              {document.sha256 ?? "Unavailable"}
                            </dd>
                          </div>
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

      {fixtureDocuments.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle>Closed synthetic analysis sources</CardTitle>
            <p className="mt-1 text-sm leading-6 text-amber-950">
              These {fixtureDocuments.length} fixture records support only the
              designated demonstration analysis. They are not backend document
              metadata and cannot be deleted here.
            </p>
          </CardHeader>
        </Card>
      )}
    </CasePage>
  );
}
