import type {
  BackendAuditEvent,
  BackendCase,
  BackendCaseCreate,
  BackendDocumentMetadata,
  BackendDocumentMetadataCreate,
  BackendLoginRequest,
  BackendTokenResponse,
  BackendUser,
} from "@/lib/api/backend-types";

export interface LegalBridgeClient {
  readonly mode: "mock" | "http";
  login(request: BackendLoginRequest): Promise<BackendTokenResponse>;
  restoreSession(): Promise<BackendUser | null>;
  logout(): Promise<void>;
  listCases(): Promise<BackendCase[]>;
  getCase(caseId: string): Promise<BackendCase>;
  createCase(request: BackendCaseCreate): Promise<BackendCase>;
  listDocuments(caseId: string): Promise<BackendDocumentMetadata[]>;
  createDocumentMetadata(
    caseId: string,
    request: BackendDocumentMetadataCreate,
  ): Promise<BackendDocumentMetadata>;
  deleteDocumentMetadata(caseId: string, documentId: string): Promise<void>;
  listAuditEvents(caseId: string): Promise<BackendAuditEvent[]>;
}
