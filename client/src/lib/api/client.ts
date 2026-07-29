import type {
  AddDocumentsRequest,
  ApiEnvelope,
  ApprovalResponse,
  CreateCaseRequest,
  LegalBridgeClient,
  ObservabilityResponse,
  SignInRequest,
  SignInResponse,
  WorkflowCommandRequest,
} from "@/lib/api/contracts";
import { DEMO_CASE_ID, seedAuditEvents, seedCase } from "@/lib/demo/seed";
import { publicEnv } from "@/lib/env/public-env";
import type {
  AuditEvent,
  CaseRecord,
  DocumentMeta,
  WorkflowRun,
} from "@/lib/types/domain";

export class LegalBridgeClientError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "UNAVAILABLE" | "INVALID_CONFIGURATION",
  ) {
    super(message);
    this.name = "LegalBridgeClientError";
  }
}

function envelope<T>(data: T): ApiEnvelope<T> {
  return { data, mode: "mock", generatedAt: "2026-01-20T12:00:00.000Z" };
}

export class MockLegalBridgeClient implements LegalBridgeClient {
  async signIn(request: SignInRequest): Promise<ApiEnvelope<SignInResponse>> {
    const authenticated =
      request.email.trim().toLowerCase() === "attorney@legalbridge.demo" &&
      request.password === "LegalBridge@2026";
    return envelope({
      authenticated,
      userEmail: authenticated ? "attorney@legalbridge.demo" : undefined,
    });
  }

  async listCases(): Promise<ApiEnvelope<CaseRecord[]>> {
    return envelope([seedCase]);
  }

  async getCase(caseId: string): Promise<ApiEnvelope<CaseRecord>> {
    if (caseId !== DEMO_CASE_ID) {
      throw new LegalBridgeClientError("Demonstration case not found.", "NOT_FOUND");
    }
    return envelope(seedCase);
  }

  async createCase(request: CreateCaseRequest): Promise<ApiEnvelope<CaseRecord>> {
    return envelope({ ...seedCase, ...request.case, id: "case-local-contract-preview" });
  }

  async addDocuments(
    request: AddDocumentsRequest,
  ): Promise<ApiEnvelope<DocumentMeta[]>> {
    return envelope(request.documents);
  }

  async commandWorkflow(
    request: WorkflowCommandRequest,
  ): Promise<ApiEnvelope<WorkflowRun>> {
    if (request.caseId !== DEMO_CASE_ID) {
      throw new LegalBridgeClientError("Workflow case not found.", "NOT_FOUND");
    }
    return envelope(seedCase.workflow);
  }

  async approveMotion(): Promise<ApiEnvelope<ApprovalResponse>> {
    throw new LegalBridgeClientError(
      "Approval mutations are handled by the local demonstration store.",
      "UNAVAILABLE",
    );
  }

  async listAuditEvents(caseId: string): Promise<ApiEnvelope<AuditEvent[]>> {
    return envelope(seedAuditEvents.filter((event) => event.caseId === caseId));
  }

  async getObservability(
    caseId: string,
  ): Promise<ApiEnvelope<ObservabilityResponse>> {
    return envelope({
      caseId,
      workflow: seedCase.workflow,
      facts: 24,
      timelineEvents: seedCase.timeline.length,
      contradictions: seedCase.contradictions.length,
      potentialConcerns: seedCase.findings.length,
      authorities: seedCase.authorities.length,
      citationVerificationPercent: 100,
      simulatedInputTokens: 18420,
      simulatedOutputTokens: 6370,
      simulatedCostInr: 0,
    });
  }
}

export class HttpLegalBridgeClient implements LegalBridgeClient {
  private unavailable() {
    return new LegalBridgeClientError(
      "Backend not available in this frontend checkpoint.",
      "UNAVAILABLE",
    );
  }

  signIn(): Promise<ApiEnvelope<SignInResponse>> {
    return Promise.reject(this.unavailable());
  }
  listCases(): Promise<ApiEnvelope<CaseRecord[]>> {
    return Promise.reject(this.unavailable());
  }
  getCase(): Promise<ApiEnvelope<CaseRecord>> {
    return Promise.reject(this.unavailable());
  }
  createCase(): Promise<ApiEnvelope<CaseRecord>> {
    return Promise.reject(this.unavailable());
  }
  addDocuments(): Promise<ApiEnvelope<DocumentMeta[]>> {
    return Promise.reject(this.unavailable());
  }
  commandWorkflow(): Promise<ApiEnvelope<WorkflowRun>> {
    return Promise.reject(this.unavailable());
  }
  approveMotion(): Promise<ApiEnvelope<ApprovalResponse>> {
    return Promise.reject(this.unavailable());
  }
  listAuditEvents(): Promise<ApiEnvelope<AuditEvent[]>> {
    return Promise.reject(this.unavailable());
  }
  getObservability(): Promise<ApiEnvelope<ObservabilityResponse>> {
    return Promise.reject(this.unavailable());
  }
}

export function createLegalBridgeClient(): LegalBridgeClient {
  if (!publicEnv.dataMode) {
    throw new LegalBridgeClientError(
      publicEnv.configurationError ?? "Invalid frontend configuration.",
      "INVALID_CONFIGURATION",
    );
  }
  return new MockLegalBridgeClient();
}

export const queryKeys = {
  cases: ["cases"] as const,
  case: (caseId: string) => ["cases", caseId] as const,
  audit: (caseId: string) => ["cases", caseId, "audit"] as const,
  observability: (caseId: string) =>
    ["cases", caseId, "observability"] as const,
};
