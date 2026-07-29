import type {
  BackendAuditEvent,
  BackendAnalysisRun,
  BackendAnalysisSummary,
  BackendCase,
  BackendCaseCreate,
  BackendDashboardSummary,
  BackendDocumentDetail,
  BackendDocumentMetadata,
  BackendDocumentMetadataCreate,
  BackendLoginRequest,
  BackendTokenResponse,
  BackendUser,
  BackendCopilotThread,
  BackendMotion,
} from "@/lib/api/backend-types";

export interface LegalBridgeClient {
  readonly mode: "mock" | "http";
  login(request: BackendLoginRequest): Promise<BackendTokenResponse>;
  restoreSession(): Promise<BackendUser | null>;
  logout(): Promise<void>;
  getDashboardSummary(): Promise<BackendDashboardSummary>;
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
  getAnalysisSummary(caseId: string): Promise<BackendAnalysisSummary>;
  runAnalysis(caseId: string): Promise<BackendAnalysisRun>;
  createCopilotThread(caseId: string, title: string): Promise<BackendCopilotThread>;
  sendCopilotMessage(
    caseId: string,
    threadId: string,
    content: string,
  ): Promise<{
    user_message: BackendCopilotThread["messages"][number];
    assistant_message: BackendCopilotThread["messages"][number];
  }>;
  createMotionVersion(
    caseId: string,
    motionId: string,
    renderedText: string,
  ): Promise<BackendMotion>;
  runMotionAction(
    caseId: string,
    motionId: string,
    action: "citation-check" | "ethics-check" | "submit-review",
  ): Promise<BackendMotion>;
  reviewMotion(
    caseId: string,
    motionId: string,
    decision: "changes_requested" | "approved" | "rejected",
    comments: string,
    pin: string,
  ): Promise<BackendMotion>;
  exportMotion(caseId: string, motionId: string, format: "pdf" | "docx"): Promise<Blob>;
}
