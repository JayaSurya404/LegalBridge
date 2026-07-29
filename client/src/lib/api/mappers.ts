import type {
  BackendAuditEvent,
  BackendCase,
  BackendCaseCreate,
  BackendDocumentMetadata,
  BackendUser,
} from "@/lib/api/backend-types";
import {
  agentDefinitions,
  DEMO_CASE_ID,
  seedCase,
} from "@/lib/demo/seed";
import type {
  AuditEvent,
  AuthenticatedUser,
  CaseRecord,
  DocumentMeta,
  NewCaseInput,
} from "@/lib/types/domain";

export const BACKEND_DEMO_CASE_NUMBER = "LB-DEMO-2026-001";

export function mapBackendUser(user: BackendUser): AuthenticatedUser {
  return {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active,
  };
}

function emptyAnalysisCase(backend: BackendCase): CaseRecord {
  return {
    id: backend.id,
    title: backend.title,
    reference: backend.case_number,
    allegation:
      backend.description ??
      "No allegation summary was supplied. Extracted source pages do not create an allegation or legal conclusion.",
    allegationType: backend.allegation_type ?? "Not specified",
    court: backend.court_name ?? "Not specified",
    jurisdiction: backend.jurisdiction ?? "Not specified",
    clientName: "Not collected in the Phase 4 integration",
    advocateName: "Assigned from the authenticated workspace",
    status: backend.status,
    synthetic: true,
    createdAt: backend.created_at,
    reviewStatus: "pending",
    documents: [],
    workflow: {
      status: "idle",
      currentIndex: 0,
      nodes: agentDefinitions.map((node, index) => ({
        ...node,
        output:
          "No case-specific analysis exists. Source extraction may produce reviewable pages, but no AI, legal reasoning, or backend agent execution has occurred.",
        sourceRefs: [],
        status: index === 0 ? "queued" : "locked",
      })),
    },
    timeline: [],
    contradictions: [],
    findings: [],
    authorities: [],
    strategies: [],
    ethicsArguments: [],
    citations: [],
    motionVersions: [],
    currentMotion: "",
    approval: null,
    assignedAttorneyId: backend.assigned_attorney_id,
    backendPersisted: true,
  };
}

function syntheticFixtureDocuments(): DocumentMeta[] {
  return structuredClone(seedCase.documents).map((document) => ({
    ...document,
    origin: "synthetic_fixture",
    sourceLabel: `${document.sourceLabel} · closed synthetic analysis fixture`,
  }));
}

export function mapBackendCase(
  backend: BackendCase,
  existing?: CaseRecord,
): CaseRecord {
  if (backend.case_number !== BACKEND_DEMO_CASE_NUMBER) {
    const empty = emptyAnalysisCase(backend);
    return existing?.backendPersisted
      ? {
          ...existing,
          ...empty,
          documents: existing.documents,
        }
      : empty;
  }

  const shouldPreserveExisting = Boolean(
    existing &&
      (existing.id === backend.id ||
        existing.id === DEMO_CASE_ID ||
        existing.reference === seedCase.reference ||
        existing.reference === BACKEND_DEMO_CASE_NUMBER),
  );
  const preserved =
    shouldPreserveExisting && existing
      ? structuredClone(existing)
      : structuredClone(seedCase);
  return {
    ...preserved,
    id: backend.id,
    title: backend.title,
    reference: backend.case_number,
    allegation: backend.description ?? preserved.allegation,
    allegationType: backend.allegation_type ?? "Synthetic property allegation",
    court: backend.court_name ?? preserved.court,
    jurisdiction: backend.jurisdiction ?? preserved.jurisdiction,
    status: backend.status,
    createdAt: backend.created_at,
    documents: [
      ...syntheticFixtureDocuments(),
      ...(existing?.documents.filter(
        (document) => document.origin === "backend",
      ) ?? []),
    ],
    assignedAttorneyId: backend.assigned_attorney_id,
    backendPersisted: true,
    synthetic: true,
  };
}

export function mapBackendDocument(
  document: BackendDocumentMetadata,
): DocumentMeta {
  const extension = document.original_filename.split(".").at(-1)?.toUpperCase();
  const type: DocumentMeta["type"] =
    extension === "PDF" || extension === "TXT" || extension === "DOCX"
      ? extension
      : document.content_type === "application/pdf"
        ? "PDF"
        : document.content_type === "text/plain"
          ? "TXT"
          : "DOCX";
  return {
    id: document.id,
    name: document.original_filename,
    type,
    mimeType: document.content_type,
    size: document.size_bytes,
    status: "processed",
    addedAt: document.created_at,
    sourceLabel: `Backend metadata · ${document.category}`,
    category: document.category,
    sha256: document.sha256,
    origin: "backend",
    extractionStatus: document.extraction_status,
    parserName: document.parser_name,
    parserVersion: document.parser_version,
    pageCount: document.page_count,
    pages: document.page_count,
    extractedCharacterCount: document.extracted_character_count,
    extractionError: document.extraction_error,
    binaryExists: document.binary_exists,
  };
}

export function mergeBackendDocuments(
  record: CaseRecord,
  backendDocuments: BackendDocumentMetadata[],
): DocumentMeta[] {
  const synthetic =
    record.reference === BACKEND_DEMO_CASE_NUMBER
      ? record.documents.filter(
          (document) => document.origin === "synthetic_fixture",
        )
      : [];
  return [...synthetic, ...backendDocuments.map(mapBackendDocument)];
}

export function mapBackendAuditEvent(event: BackendAuditEvent): AuditEvent {
  const metadata = Object.entries(event.metadata_json)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
  return {
    id: event.id,
    caseId: event.case_id ?? "",
    type: event.event_type,
    message: event.message,
    timestamp: event.created_at,
    actor: event.actor_user_id ?? "System",
    relatedEntity: `${event.entity_type} · ${event.entity_id}`,
    metadata: metadata || "Backend-persisted event",
    source: "backend",
  };
}

export function mergeAuditEvents(
  current: AuditEvent[],
  backend: BackendAuditEvent[],
): AuditEvent[] {
  const byId = new Map(current.map((event) => [event.id, event]));
  for (const event of backend) byId.set(event.id, mapBackendAuditEvent(event));
  return [...byId.values()].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}

export function mapNewCaseRequest(
  input: NewCaseInput,
  user: AuthenticatedUser,
): BackendCaseCreate {
  return {
    case_number: input.reference,
    title: input.title,
    description: input.allegation,
    court_name: input.court,
    jurisdiction: input.jurisdiction,
    allegation_type: input.allegationType,
    status: "draft",
    assigned_attorney_id: user.role === "attorney" ? user.id : null,
  };
}
