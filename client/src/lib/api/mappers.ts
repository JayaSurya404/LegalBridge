import type {
  BackendAnalysisSummary,
  BackendAuditEvent,
  BackendCase,
  BackendCaseCreate,
  BackendDocumentMetadata,
  BackendUser,
} from "@/lib/api/backend-types";
import { agentDefinitions } from "@/lib/demo/seed";
import type {
  AuditEvent,
  AuthenticatedUser,
  CaseRecord,
  DocumentMeta,
  NewCaseInput,
} from "@/lib/types/domain";

export const BACKEND_DEMO_CASE_NUMBER = "LB-CASE-2026-001";

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
      "No allegation summary was supplied. Extracted source pages do not create a legal conclusion.",
    allegationType: backend.allegation_type ?? "Not specified",
    court: backend.court_name ?? "Not specified",
    jurisdiction: backend.jurisdiction ?? "Not specified",
    clientName: "Fictional case subject",
    advocateName: "Assigned from the authenticated workspace",
    status: backend.status,
    synthetic: true,
    createdAt: backend.created_at,
    reviewStatus: "pending",
    documents: [],
    workflow: {
      status: "idle",
      currentIndex: 0,
      nodes: agentDefinitions.slice(0, 13).map((node, index) => ({
        ...node,
        output: "Analysis pending. No database-backed agent result exists.",
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

export function mapBackendCase(
  backend: BackendCase,
  existing?: CaseRecord,
): CaseRecord {
  const empty = emptyAnalysisCase(backend);
  return existing?.backendPersisted
    ? { ...existing, ...empty, documents: existing.documents }
    : empty;
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
    sourceLabel: `Database source · ${document.category}`,
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
  _record: CaseRecord,
  backendDocuments: BackendDocumentMetadata[],
): DocumentMeta[] {
  return backendDocuments.map(mapBackendDocument);
}

export function applyBackendAnalysis(
  record: CaseRecord,
  summary: BackendAnalysisSummary,
): CaseRecord {
  if (!summary.analysis_run) return record;
  const sourceLabel = (documentId: string | null, pageId: string | null) => {
    const document = record.documents.find((item) => item.id === documentId);
    return document
      ? `${document.name} · extracted source`
      : pageId
        ? "Extracted source page"
        : "Source reference unavailable";
  };
  const completed = summary.agents.filter(
    (agent) => agent.status === "completed",
  ).length;
  const currentIndex = Math.min(completed, Math.max(summary.agents.length - 1, 0));
  const motion = summary.motions[0];
  const approvedReview = motion?.reviews
    .filter((review) => review.decision === "approved")
    .at(-1);
  return {
    ...record,
    workflow: {
      status:
        summary.analysis_run.status === "running"
          ? "running"
          : summary.analysis_run.status === "completed"
            ? "completed"
            : "idle",
      currentIndex,
      startedAt: summary.analysis_run.started_at ?? undefined,
      completedAt: summary.analysis_run.completed_at ?? undefined,
      nodes: summary.agents.map((agent) => ({
        id: agent.id,
        name: agent.agent_name,
        description: `Agent ${agent.sequence_number}: ${agent.agent_key.replaceAll("_", " ")}`,
        status:
          agent.status === "completed"
            ? "completed"
            : agent.status === "running"
              ? "running"
              : "queued",
        durationMs: 0,
        input: agent.input_summary,
        output: agent.output_summary || agent.error_message || "Pending",
        sourceRefs: [],
      })),
    },
    timeline: summary.timeline.map((event) => ({
      id: event.id,
      timestamp: `${event.event_date ?? "Date unresolved"}${event.event_time ? `T${event.event_time}` : ""}`,
      title: event.title,
      detail: event.description,
      confidence: event.confidence,
      source: sourceLabel(event.source_document_id, event.source_page_id),
      location: event.event_type.replaceAll("_", " "),
      excerpt: event.description,
      verified: false,
    })),
    contradictions: summary.contradictions.map((item) => ({
      id: item.id,
      topic: item.title,
      statementA: item.source_a_excerpt,
      sourceA: sourceLabel(item.source_a_document_id, item.source_a_page_id),
      statementB: item.source_b_excerpt,
      sourceB: sourceLabel(item.source_b_document_id, item.source_b_page_id),
      severity: item.severity === "critical" ? "high" : item.severity,
      confidence: 0.82,
      significance: item.description,
      reviewStatus:
        item.status === "accepted"
          ? "approved"
          : item.status === "dismissed"
            ? "rejected"
            : item.status === "reviewed"
              ? "revision"
              : "pending",
      resolutionNotes: item.reviewer_note ?? "",
    })),
    findings: summary.procedural_findings.map((item) => ({
      id: item.id,
      issue: item.title,
      rationale: item.description,
      sources: [sourceLabel(item.source_document_id, item.source_page_id)],
      missingInformation: item.defence_opportunity,
      confidence: item.severity === "high" ? 0.86 : 0.76,
      verificationStatus:
        item.review_status === "approved" ? "verified" : "review",
      reviewAction: "Requires attorney verification",
    })),
    authorities: summary.research.map((result) => ({
      id: result.authority.id,
      type: "Demonstration precedent",
      title: `${result.authority.title} (${result.authority.citation})`,
      jurisdiction: result.authority.jurisdiction,
      date: result.authority.decision_date ?? "Synthetic date unavailable",
      summary: result.applicability_summary,
      passage: result.authority.summary,
      sourceStatus: "resolved",
      applicability:
        result.combined_score > 0.35
          ? "strong"
          : result.combined_score > 0.15
            ? "moderate"
            : "limited",
      distinguishingFacts: result.limitation_summary,
      posture: "neutral",
    })),
    strategies: summary.strategies.map((item) => ({
      id: item.id,
      title: item.title,
      factualBasis: item.rationale,
      legalBasis: ["Synthetic demonstration authority — not official law"],
      sources: item.supporting_source_ids_json,
      weaknesses: item.risk,
      missingEvidence: item.next_action,
      citationStatus: "review",
      ethicsStatus: "pending",
      included: false,
      attorneyNotes: item.description,
    })),
    ethicsArguments: summary.ethics_findings.map((item) => ({
      id: item.id,
      title: item.title,
      factualSupport: item.description,
      legalSupport: "Ethics Auditor control; not a legal conclusion.",
      sources: [],
      risk: item.severity === "critical" ? "high" : item.severity,
      status: "pending",
      explanation: item.required_action,
      history: [`Persisted status: ${item.status}`],
    })),
    citations:
      motion?.citation_checks.map((item) => ({
        id: item.id,
        proposition: item.citation_text,
        authorityId: item.authority_id ?? item.source_page_id ?? "missing",
        sourceExists: !["missing_source", "unsupported"].includes(item.status),
        metadataVerified: item.status === "verified_source",
        quotationVerified: item.status === "verified_source",
        locationVerified: item.status === "verified_source",
        propositionSupported: !["missing_source", "unsupported"].includes(
          item.status,
        ),
        applicable: item.status !== "unsupported",
        distinguishingFacts: item.message,
        status:
          item.status === "verified_source"
            ? "verified"
            : item.status === "synthetic_demo"
              ? "review"
              : "blocked",
      })) ?? [],
    motionVersions:
      motion?.versions.map((version) => ({
        version: version.version_number,
        body: version.rendered_text,
        savedAt: version.created_at,
        mockHash: version.id,
      })) ?? [],
    currentMotion: motion?.versions.at(-1)?.rendered_text ?? "",
    reviewStatus: approvedReview
      ? "approved"
      : motion?.status === "changes_requested"
        ? "revision"
        : "pending",
    approval: approvedReview
      ? {
          reviewerName: approvedReview.reviewer_user_id,
          timestamp: approvedReview.reviewed_at ?? approvedReview.created_at,
          version: motion?.current_version ?? 1,
          mockHash: motion?.versions.at(-1)?.id ?? "",
        }
      : null,
  };
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
