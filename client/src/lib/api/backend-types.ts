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

export interface BackendDocumentMetadata {
  id: string;
  organization_id: string;
  case_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  category: string;
  status: "metadata_only";
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

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
