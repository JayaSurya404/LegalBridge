export type BackendUserRole = "admin" | "attorney" | "reviewer";
export type BackendCaseStatus =
  | "draft"
  | "active"
  | "review"
  | "closed"
  | "archived";

export interface BackendUser {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: BackendUserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackendLoginRequest {
  organization_slug: string;
  email: string;
  password: string;
}

export interface BackendRefreshRequest {
  refresh_token: string;
}

export interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: BackendUser;
}

export interface BackendCase {
  id: string;
  organization_id: string;
  case_number: string;
  title: string;
  description: string | null;
  court_name: string | null;
  jurisdiction: string | null;
  allegation_type: string | null;
  status: BackendCaseStatus;
  created_by_id: string;
  assigned_attorney_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendCaseCreate {
  case_number: string;
  title: string;
  description: string | null;
  court_name: string | null;
  jurisdiction: string | null;
  allegation_type: string | null;
  status: BackendCaseStatus;
  assigned_attorney_id: string | null;
}

export type BackendDocumentExtractionStatus =
  | "metadata_only"
  | "uploaded"
  | "processing"
  | "processed"
  | "partially_processed"
  | "ocr_required"
  | "failed";

export interface BackendDocumentSummary {
  id: string;
  organization_id: string;
  case_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  category: string;
  status: "metadata_only";
  extraction_status: BackendDocumentExtractionStatus;
  parser_name: string | null;
  parser_version: string | null;
  page_count: number;
  extracted_character_count: number;
  extraction_error: string | null;
  processed_at: string | null;
  original_uploaded_at: string | null;
  binary_exists: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface BackendDocumentPage {
  id: string;
  organization_id: string;
  case_id: string;
  document_id: string;
  page_number: number;
  page_label: string;
  extracted_text: string;
  character_count: number;
  extraction_method: string;
  created_at: string;
  updated_at: string;
}

export interface BackendDocumentDetail extends BackendDocumentSummary {
  pages: BackendDocumentPage[];
}

export type BackendDocumentMetadata = BackendDocumentSummary;

export interface BackendDocumentMetadataCreate {
  original_filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  category: string;
}

export interface BackendAuditEvent {
  id: string;
  organization_id: string;
  case_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  message: string;
  entity_type: string;
  entity_id: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BackendDashboardSummary {
  total_cases: number;
  active_cases: number;
  review_cases: number;
  draft_cases: number;
  closed_cases: number;
  archived_cases: number;
  total_documents: number;
  processed_documents: number;
  ocr_required_documents: number;
  failed_documents: number;
  extracted_source_pages: number;
  total_audit_events: number;
  recent_audit_events: BackendAuditEvent[];
}

export interface BackendAnalysisRun {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  provider: string;
  started_at: string | null;
  completed_at: string | null;
  failure_message: string | null;
  summary: string;
  created_at: string;
}

export interface BackendAgentRun {
  id: string;
  agent_key: string;
  agent_name: string;
  sequence_number: number;
  status: string;
  input_summary: string;
  output_summary: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface BackendFact {
  id: string;
  fact_type: string;
  fact_text: string;
  confidence: number;
  source_document_id: string | null;
  source_page_id: string | null;
  status: string;
}

export interface BackendTimelineEvent {
  id: string;
  event_date: string | null;
  event_time: string | null;
  title: string;
  description: string;
  event_type: string;
  confidence: number;
  source_document_id: string | null;
  source_page_id: string | null;
  sequence_number: number;
}

export interface BackendContradiction {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  source_a_document_id: string | null;
  source_a_page_id: string | null;
  source_a_excerpt: string;
  source_b_document_id: string | null;
  source_b_page_id: string | null;
  source_b_excerpt: string;
  reviewer_note: string | null;
}

export interface BackendProceduralFinding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  review_status: string;
  defence_opportunity: string;
  source_document_id: string | null;
  source_page_id: string | null;
  authority_id: string | null;
}

export interface BackendLegalAuthority {
  id: string;
  authority_type: string;
  title: string;
  citation: string;
  jurisdiction: string;
  court: string;
  decision_date: string | null;
  summary: string;
  full_text: string;
  source_status: "synthetic_demo" | "unverified" | "verified_official";
  is_synthetic: boolean;
}

export interface BackendResearchResult {
  id: string;
  rank: number;
  lexical_score: number;
  semantic_score: number;
  combined_score: number;
  applicability_summary: string;
  limitation_summary: string;
  source_status: string;
  authority: BackendLegalAuthority;
}

export interface BackendStrategy {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  rationale: string;
  risk: string;
  next_action: string;
  supporting_source_ids_json: string[];
}

export interface BackendEthicsFinding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  required_action: string;
}

export interface BackendCitationCheck {
  id: string;
  citation_text: string;
  authority_id: string | null;
  source_document_id: string | null;
  source_page_id: string | null;
  status: string;
  message: string;
}

export interface BackendMotionVersion {
  id: string;
  version_number: number;
  content_json: Record<string, string>;
  rendered_text: string;
  citation_check_status: string;
  ethics_check_status: string;
  created_at: string;
}

export interface BackendAttorneyReview {
  id: string;
  reviewer_user_id: string;
  decision: string;
  comments: string;
  review_pin_verified: boolean;
  reviewed_at: string | null;
  created_at: string;
}

export interface BackendMotion {
  id: string;
  title: string;
  motion_type: string;
  status: string;
  current_version: number;
  versions: BackendMotionVersion[];
  citation_checks: BackendCitationCheck[];
  reviews: BackendAttorneyReview[];
}

export interface BackendCopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  source_references_json: Array<{
    document_id?: string;
    page_id?: string;
    label: string;
  }>;
  created_at: string;
}

export interface BackendCopilotThread {
  id: string;
  title: string;
  messages: BackendCopilotMessage[];
  created_at: string;
  updated_at: string;
}

export interface BackendAnalysisSummary {
  analysis_run: BackendAnalysisRun | null;
  agents: BackendAgentRun[];
  facts: BackendFact[];
  timeline: BackendTimelineEvent[];
  contradictions: BackendContradiction[];
  procedural_findings: BackendProceduralFinding[];
  research: BackendResearchResult[];
  strategies: BackendStrategy[];
  ethics_findings: BackendEthicsFinding[];
  motions: BackendMotion[];
  copilot_threads: BackendCopilotThread[];
  counts: Record<string, number>;
}

export interface BackendValidationDetail {
  location: string;
  message: string;
  type: string;
}

export interface BackendErrorResponse {
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: BackendValidationDetail[];
  };
}
