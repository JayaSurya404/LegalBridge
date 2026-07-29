import type {
  Approval,
  AuditEvent,
  CaseRecord,
  DocumentMeta,
  NewCaseInput,
  WorkflowRun,
} from "@/lib/types/domain";

export interface ApiEnvelope<T> {
  data: T;
  mode: "mock";
  generatedAt: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  authenticated: boolean;
  userEmail?: string;
}

export interface CreateCaseRequest {
  case: NewCaseInput;
}

export interface AddDocumentsRequest {
  caseId: string;
  documents: DocumentMeta[];
}

export interface WorkflowCommandRequest {
  caseId: string;
  command: "start" | "pause" | "resume" | "reset";
}

export interface ApprovalRequest {
  caseId: string;
  reviewerName: string;
  pin: string;
  responsibilityConfirmed: boolean;
}

export interface ApprovalResponse {
  approval: Approval;
  exportUnlocked: boolean;
}

export interface ObservabilityResponse {
  caseId: string;
  workflow: WorkflowRun;
  facts: number;
  timelineEvents: number;
  contradictions: number;
  potentialConcerns: number;
  authorities: number;
  citationVerificationPercent: number;
  simulatedInputTokens: number;
  simulatedOutputTokens: number;
  simulatedCostInr: number;
}

export interface LegalBridgeClient {
  signIn(request: SignInRequest): Promise<ApiEnvelope<SignInResponse>>;
  listCases(): Promise<ApiEnvelope<CaseRecord[]>>;
  getCase(caseId: string): Promise<ApiEnvelope<CaseRecord>>;
  createCase(request: CreateCaseRequest): Promise<ApiEnvelope<CaseRecord>>;
  addDocuments(request: AddDocumentsRequest): Promise<ApiEnvelope<DocumentMeta[]>>;
  commandWorkflow(request: WorkflowCommandRequest): Promise<ApiEnvelope<WorkflowRun>>;
  approveMotion(request: ApprovalRequest): Promise<ApiEnvelope<ApprovalResponse>>;
  listAuditEvents(caseId: string): Promise<ApiEnvelope<AuditEvent[]>>;
  getObservability(caseId: string): Promise<ApiEnvelope<ObservabilityResponse>>;
}
