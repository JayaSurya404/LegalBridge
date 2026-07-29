"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileCheck2,
  FilePlus2,
  FileText,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
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
import type { BackendDocumentDetail } from "@/lib/api/backend-types";
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
  preliminaryHash?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCount(value: number | undefined) {
  return new Intl.NumberFormat("en-IN").format(value ?? 0);
}

function isSafeFilename(value: string) {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    value === value.trim() &&
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
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function apiErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    const prefix =
      error.status === 413
        ? "The backend rejected this file because it exceeds the configured upload limit. "
        : error.status === 409
          ? "The same binary content already exists in this case. "
          : "";
    return `${prefix}${error.message}${error.requestId ? ` Request ID: ${error.requestId}.` : ""}`;
  }
  return "The document request failed. Confirm the backend is available and retry.";
}

export function DocumentsPage() {
  const { caseId, record } = useCaseRecord();
  const currentUser = useAppStore((state) => state.currentUser);
  const syncDocuments = useAppStore((state) => state.syncDocuments);
  const uploadPersistentDocument = useAppStore(
    (state) => state.uploadPersistentDocument,
  );
  const getDocumentDetail = useAppStore((state) => state.getDocumentDetail);
  const downloadDocument = useAppStore((state) => state.downloadDocument);
  const reprocessDocument = useAppStore((state) => state.reprocessDocument);
  const deleteDocumentMetadata = useAppStore(
    (state) => state.deleteDocumentMetadata,
  );
  const syncAuditEvents = useAppStore((state) => state.syncAuditEvents);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingDocument[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [activeName, setActiveName] = useState("");
  const [activeStage, setActiveStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [category, setCategory] = useState("evidence");
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(
    null,
  );
  const [details, setDetails] = useState<Record<string, BackendDocumentDetail>>(
    {},
  );
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([syncDocuments(caseId), syncAuditEvents(caseId)])
      .catch((error: unknown) => {
        if (active) setMessages([apiErrorMessage(error)]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, syncAuditEvents, syncDocuments]);

  if (!record) return <UnknownCase />;

  const persistedDocuments = record.documents.filter(
    (document) => document.origin === "backend",
  );
  const fixtureDocuments = record.documents.filter(
    (document) => document.origin === "synthetic_fixture",
  );
  const canEdit =
    currentUser?.role === "admin" || currentUser?.role === "attorney";
  const processedCount = persistedDocuments.filter(
    (document) => document.extractionStatus === "processed",
  ).length;
  const ocrRequiredCount = persistedDocuments.filter(
    (document) => document.extractionStatus === "ocr_required",
  ).length;
  const failedCount = persistedDocuments.filter(
    (document) => document.extractionStatus === "failed",
  ).length;
  const extractedPageCount = persistedDocuments.reduce(
    (total, document) => total + (document.pageCount ?? 0),
    0,
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
      const name = file.name;
      if (!isSafeFilename(name)) {
        errors.push(`${name || "Unnamed file"}: filename is unsafe or too long.`);
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
          `${name}: extension and browser-reported MIME type do not match.`,
        );
        continue;
      }
      if (file.size === 0) {
        errors.push(`${name}: empty files are not accepted.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${name}: exceeds the 50 MB upload limit.`);
        continue;
      }
      if (known.has(name.toLowerCase())) {
        errors.push(`${name}: a record with this filename is already present.`);
        continue;
      }
      if (next.length >= available) {
        if (!capacityMessageAdded) {
          errors.push(
            `Only ${available} more document${available === 1 ? "" : "s"} can be selected; this workspace limits a case to ${MAX_FILES} records.`,
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
        `${next.length} file${next.length === 1 ? "" : "s"} ready for private upload.`,
      );
    }
  };

  const uploadPending = async () => {
    setUploading(true);
    setMessages([]);
    const errors: string[] = [];
    let completed = 0;
    for (const [index, document] of pending.entries()) {
      setActiveName(document.name);
      try {
        setActiveStage("Calculating preliminary browser SHA-256");
        setProgress(Math.round(((index + 0.15) / pending.length) * 100));
        const preliminaryHash = await sha256(document.file);
        setPending((current) =>
          current.map((item) =>
            item.name === document.name
              ? { ...item, preliminaryHash }
              : item,
          ),
        );
        setActiveStage("Uploading bytes for server validation and extraction");
        setProgress(Math.round(((index + 0.45) / pending.length) * 100));
        await uploadPersistentDocument(
          caseId,
          document.file,
          document.category,
        );
        setActiveStage("Persisting extracted source pages");
        setProgress(Math.round(((index + 0.85) / pending.length) * 100));
        completed += 1;
        setProgress(Math.round(((index + 1) / pending.length) * 100));
      } catch (error) {
        errors.push(`${document.name}: ${apiErrorMessage(error)}`);
      }
    }
    setPending([]);
    setActiveName("");
    setActiveStage("");
    setUploading(false);
    setMessages(errors);
    if (completed > 0) {
      try {
        await Promise.all([syncDocuments(caseId), syncAuditEvents(caseId)]);
      } catch (error) {
        setMessages((current) => [
          ...current,
          `Documents were uploaded, but refresh failed: ${apiErrorMessage(error)}`,
        ]);
      }
      toast.success(
        `${completed} document${completed === 1 ? "" : "s"} stored and extraction attempted.`,
      );
    }
  };

  const refresh = async () => {
    setLoading(true);
    setMessages([]);
    try {
      await Promise.all([syncDocuments(caseId), syncAuditEvents(caseId)]);
      setDetails({});
    } catch (error) {
      setMessages([apiErrorMessage(error)]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceViewer = async (document: DocumentMeta) => {
    if (expandedDocumentId === document.id) {
      setExpandedDocumentId(null);
      return;
    }
    setExpandedDocumentId(document.id);
    if (details[document.id]) return;
    setDetailLoadingId(document.id);
    try {
      const detail = await getDocumentDetail(caseId, document.id);
      setDetails((current) => ({ ...current, [document.id]: detail }));
    } catch (error) {
      setMessages([`${document.name}: ${apiErrorMessage(error)}`]);
    } finally {
      setDetailLoadingId(null);
    }
  };

  const downloadOriginal = async (document: DocumentMeta) => {
    setWorkingId(document.id);
    try {
      const blob = await downloadDocument(caseId, document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.name;
      link.click();
      URL.revokeObjectURL(url);
      await syncAuditEvents(caseId);
      toast.success("Original file download started.");
    } catch (error) {
      setMessages([`${document.name}: ${apiErrorMessage(error)}`]);
    } finally {
      setWorkingId(null);
    }
  };

  const reprocess = async (document: DocumentMeta) => {
    setWorkingId(document.id);
    try {
      await reprocessDocument(caseId, document.id);
      const detail = await getDocumentDetail(caseId, document.id);
      setDetails((current) => ({ ...current, [document.id]: detail }));
      await syncAuditEvents(caseId);
      toast.success("Document reprocessed from the stored original.");
    } catch (error) {
      setMessages([`${document.name}: ${apiErrorMessage(error)}`]);
    } finally {
      setWorkingId(null);
    }
  };

  const removeDocument = async (document: DocumentMeta) => {
    setWorkingId(document.id);
    try {
      await deleteDocumentMetadata(caseId, document.id);
      await syncAuditEvents(caseId);
      setExpandedDocumentId((current) =>
        current === document.id ? null : current,
      );
      setDetails((current) => {
        const next = { ...current };
        delete next[document.id];
        return next;
      });
      toast.success("Stored binary, extracted pages, and document record deleted.");
    } catch (error) {
      setMessages([`${document.name}: ${apiErrorMessage(error)}`]);
    } finally {
      setWorkingId(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Extracted page text copied.");
    } catch {
      toast.error("The browser did not allow clipboard access.");
    }
  };

  return (
    <CasePage
      caseId={caseId}
      eyebrow={record.reference}
      title="Stored documents and source pages"
      description="Upload private PDF, DOCX, or TXT files for server-side validation and source extraction. Extracted text is evidence workspace material, not legal analysis."
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
          Refresh documents
        </Button>
      }
    >
      <section
        aria-label="Document extraction summary"
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {[
          ["Stored documents", persistedDocuments.length],
          ["Processed", processedCount],
          ["OCR required", ocrRequiredCount],
          ["Failed", failedCount],
          ["Extracted pages", extractedPageCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[var(--border)] bg-white p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--slate)]">
              {label}
            </p>
            <p className="mt-2 font-serif text-2xl font-semibold text-[var(--navy)]">
              {value}
            </p>
          </div>
        ))}
      </section>

      {uploading && (
        <div
          className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>
              {activeStage}: {activeName}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
            role="progressbar"
            aria-label="Document upload and extraction progress"
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
            The browser hash is preliminary. FastAPI streams the upload,
            computes the authoritative SHA-256, validates the signature, stores
            the original privately, and extracts source text.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
          role="alert"
        >
          <p className="text-sm font-semibold text-red-900">
            Some document operations were not completed
          </p>
          <ul className="mt-2 list-disc space-y-1 break-all pl-5 text-xs leading-5 text-red-800">
            {messages.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload original files</CardTitle>
            <p className="mt-1 text-sm leading-6 text-[var(--slate)]">
              PDF, TXT, or DOCX · 50 MB each · {MAX_FILES} stored records per
              case in this workspace.
            </p>
          </CardHeader>
          <CardContent>
            {!canEdit && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                Reviewer access is read-only. You may inspect source pages and
                download originals, but only attorneys and administrators may
                upload, reprocess, or delete.
              </div>
            )}
            <label className="mb-4 block text-sm font-semibold text-[var(--navy)]">
              Category
              <select
                value={category}
                disabled={!canEdit || uploading}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-slate-100"
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
                if (canEdit) setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (canEdit) selectFiles(event.dataTransfer.files);
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
                Drop files for private ingestion
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--slate)]">
                Server validation is authoritative
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
                disabled={!canEdit || uploading}
                onClick={() => inputRef.current?.click()}
              >
                <FilePlus2 className="size-4" aria-hidden="true" /> Choose files
              </Button>
            </div>
            <div className="mt-4 space-y-1 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-950">
              <p>Original binaries are stored privately behind authenticated APIs.</p>
              <p>PDF pages are physical; DOCX and unpaginated TXT pages are logical.</p>
              <p>OCR is optional and is never claimed when Tesseract is unavailable.</p>
              <p>Extraction does not perform legal analysis, research, or citation verification.</p>
            </div>
            {pending.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[var(--navy)]">
                  Ready to upload
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
                        {document.preliminaryHash && (
                          <p className="mt-1 truncate font-mono text-[10px] text-[var(--slate)]">
                            Preliminary: {document.preliminaryHash}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={uploading}
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
                  disabled={uploading}
                  onClick={() => void uploadPending()}
                >
                  {uploading ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileCheck2 className="size-4" aria-hidden="true" />
                  )}
                  Upload and extract {pending.length} file
                  {pending.length === 1 ? "" : "s"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database-backed source records</CardTitle>
            <p className="mt-1 text-sm text-[var(--slate)]">
              {persistedDocuments.length} stored record
              {persistedDocuments.length === 1 ? "" : "s"} ·{" "}
              {formatCount(extractedPageCount)} extracted pages.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-[var(--slate)]">
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Loading stored documents…
              </p>
            ) : persistedDocuments.length === 0 ? (
              <EmptyState
                title="No stored source documents"
                description={
                  canEdit
                    ? "Choose a PDF, TXT, or DOCX file to upload, validate, store, and extract."
                    : "An attorney or administrator must upload the first source document."
                }
                action={
                  canEdit ? (
                    <Button onClick={() => inputRef.current?.click()}>
                      Choose files
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {persistedDocuments.map((document) => {
                  const detail = details[document.id];
                  const expanded = expandedDocumentId === document.id;
                  const working = workingId === document.id;
                  return (
                    <article
                      key={document.id}
                      className="density-card overflow-hidden rounded-xl border border-[var(--border)]"
                    >
                      <div className="p-4">
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
                              <StatusBadge
                                status={
                                  document.extractionStatus ?? "metadata_only"
                                }
                              />
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
                              <Meta label="Size" value={formatBytes(document.size)} />
                              <Meta
                                label="Pages"
                                value={formatCount(document.pageCount)}
                              />
                              <Meta
                                label="Characters"
                                value={formatCount(
                                  document.extractedCharacterCount,
                                )}
                              />
                              <Meta
                                label="Parser"
                                value={document.parserName ?? "Not processed"}
                              />
                            </dl>
                            <p
                              className="mt-3 truncate font-mono text-[10px] text-[var(--slate)]"
                              title={document.sha256}
                            >
                              Server SHA-256: {document.sha256 ?? "Unavailable"}
                            </p>
                            {(document.extractionStatus === "ocr_required" ||
                              document.extractionStatus ===
                                "partially_processed") && (
                              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                                {document.extractionError ??
                                  "Some pages require OCR or reached an extraction limit. No text was invented."}
                              </p>
                            )}
                            {document.extractionStatus === "failed" && (
                              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-900">
                                Extraction failed:{" "}
                                {document.extractionError ??
                                  "No safe parser result is available."}{" "}
                                The original remains available for download or
                                deletion.
                              </p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={detailLoadingId === document.id}
                                onClick={() => void toggleSourceViewer(document)}
                              >
                                {expanded ? (
                                  <ChevronUp
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <ChevronDown
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                )}
                                {expanded ? "Hide sources" : "View sources"}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={!document.binaryExists || working}
                                onClick={() => void downloadOriginal(document)}
                              >
                                <Download
                                  className="size-4"
                                  aria-hidden="true"
                                />
                                Download
                              </Button>
                              {canEdit && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={!document.binaryExists || working}
                                    onClick={() => void reprocess(document)}
                                  >
                                    <RotateCcw
                                      className={`size-4 ${working ? "animate-spin" : ""}`}
                                      aria-hidden="true"
                                    />
                                    Reprocess
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={working}
                                    onClick={() => void removeDocument(document)}
                                  >
                                    <Trash2
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {expanded && (
                        <div className="border-t border-[var(--border)] bg-[var(--cream)] p-4">
                          {detailLoadingId === document.id ? (
                            <p className="flex items-center gap-2 text-sm text-[var(--slate)]">
                              <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                              />
                              Loading persisted source pages…
                            </p>
                          ) : !detail ? (
                            <p className="text-sm text-[var(--slate)]">
                              Source detail could not be loaded. Retry the
                              viewer.
                            </p>
                          ) : detail.pages.length === 0 ? (
                            <EmptyState
                              title="No extracted source pages"
                              description="This metadata-only or failed record has no persisted extracted text. The interface does not fabricate a source."
                            />
                          ) : (
                            <div className="space-y-3">
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-950">
                                Source extraction only. These pages are not
                                legal findings, verified citations, or generated
                                analysis. DOCX and unpaginated TXT labels are
                                logical, not physical court-document pages.
                              </div>
                              {detail.pages.map((page) => (
                                <details
                                  key={page.id}
                                  className="rounded-xl border border-[var(--border)] bg-white"
                                >
                                  <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]">
                                    <span className="flex items-center justify-between gap-3">
                                      <span>
                                        <span className="block text-sm font-semibold text-[var(--navy)]">
                                          {page.page_label}
                                        </span>
                                        <span className="mt-1 block text-xs text-[var(--slate)]">
                                          {page.extraction_method.replaceAll(
                                            "_",
                                            " ",
                                          )}{" "}
                                          · {formatCount(page.character_count)}{" "}
                                          characters
                                        </span>
                                      </span>
                                      <ChevronDown
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  </summary>
                                  <div className="border-t border-[var(--border)] p-4">
                                    {page.extracted_text ? (
                                      <>
                                        <div className="flex justify-end">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              void copyText(page.extracted_text)
                                            }
                                          >
                                            <Copy
                                              className="size-4"
                                              aria-hidden="true"
                                            />
                                            Copy text
                                          </Button>
                                        </div>
                                        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 font-sans text-sm leading-6 text-[var(--ink)]">
                                          {page.extracted_text}
                                        </pre>
                                      </>
                                    ) : (
                                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                                        No extracted text is available for this
                                        page. If its method is OCR required,
                                        Tesseract was unavailable or disabled;
                                        no text was invented.
                                      </p>
                                    )}
                                  </div>
                                </details>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {fixtureDocuments.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle>Closed synthetic analysis fixture references</CardTitle>
            <p className="mt-1 text-sm leading-6 text-amber-950">
              These {fixtureDocuments.length} older fixture references support
              only the pre-authored demonstration analysis. They are separate
              from the real stored and extracted documents above, are not
              generated from uploads, and cannot be deleted here.
            </p>
          </CardHeader>
        </Card>
      )}
    </CasePage>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--slate)]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[var(--navy)]">
        {value}
      </dd>
    </div>
  );
}
