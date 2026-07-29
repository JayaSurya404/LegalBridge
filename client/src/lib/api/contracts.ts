import type {
  BackendAuditEvent,
  BackendCase,
  BackendCaseCreate,
  BackendDocumentDetail,
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
  uploadDocument(
    caseId: string,
    file: File,
    category: string,
  ): Promise<BackendDocumentDetail>;
  getDocumentDetail(
    caseId: string,
    documentId: string,
  ): Promise<BackendDocumentDetail>;
  downloadDocument(caseId: string, documentId: string): Promise<Blob>;
  reprocessDocument(
    caseId: string,
    documentId: string,
  ): Promise<BackendDocumentDetail>;
  deleteDocumentMetadata(caseId: string, documentId: string): Promise<void>;
  listAuditEvents(caseId: string): Promise<BackendAuditEvent[]>;
}
