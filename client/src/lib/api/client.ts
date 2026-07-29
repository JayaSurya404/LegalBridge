import type {
  BackendAuditEvent,
  BackendCase,
  BackendCaseCreate,
  BackendDocumentDetail,
  BackendDocumentMetadata,
  BackendDocumentMetadataCreate,
  BackendErrorResponse,
  BackendLoginRequest,
  BackendTokenResponse,
  BackendUser,
} from "@/lib/api/backend-types";
import type { LegalBridgeClient } from "@/lib/api/contracts";
import { DEMO_CASE_ID, seedCase } from "@/lib/demo/seed";
import { publicEnv } from "@/lib/env/public-env";
import {
  clearBackendSession,
  readBackendSession,
  sessionFromTokenResponse,
  writeBackendSession,
} from "@/lib/auth/session-storage";

type ErrorKind =
  | "NETWORK_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION"
  | "SERVER_ERROR"
  | "INVALID_CONFIGURATION";

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly kind: ErrorKind,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null = null,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

function kindForStatus(status: number): ErrorKind {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 422) return "VALIDATION";
  return "SERVER_ERROR";
}

async function parseBackendError(response: Response): Promise<BackendApiError> {
  let payload: BackendErrorResponse | null = null;
  try {
    payload = (await response.json()) as BackendErrorResponse;
  } catch {
    payload = null;
  }
  const requestId =
    response.headers.get("X-Request-ID") ?? payload?.error?.request_id ?? null;
  return new BackendApiError(
    payload?.error?.message ?? `Backend request failed with ${response.status}.`,
    kindForStatus(response.status),
    response.status,
    payload?.error?.code ?? "unknown_backend_error",
    requestId,
    payload?.error?.details?.map(
      (detail) => `${detail.location}: ${detail.message}`,
    ) ?? [],
  );
}

let refreshPromise: Promise<BackendTokenResponse> | null = null;

export class HttpLegalBridgeClient implements LegalBridgeClient {
  readonly mode = "http" as const;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async rawResponse(path: string, init?: RequestInit): Promise<Response> {
    let response: Response;
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (
      init?.body &&
      !(typeof FormData !== "undefined" && init.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
      });
    } catch {
      throw new BackendApiError(
        "The LegalBridge backend is unavailable. Confirm the API is running and retry.",
        "NETWORK_UNAVAILABLE",
        0,
        "network_unavailable",
      );
    }
    if (!response.ok) throw await parseBackendError(response);
    return response;
  }

  private async raw<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.rawResponse(path, init);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async rotateRefreshToken(): Promise<BackendTokenResponse> {
    if (refreshPromise) return refreshPromise;
    const session = readBackendSession();
    if (!session) {
      throw new BackendApiError(
        "The session has expired. Sign in again.",
        "UNAUTHORIZED",
        401,
        "missing_session",
      );
    }
    refreshPromise = this.raw<BackendTokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
      .then((response) => {
        writeBackendSession(sessionFromTokenResponse(response));
        return response;
      })
      .catch((error: unknown) => {
        clearBackendSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("legalbridge:session-cleared"));
        }
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  }

  private async authenticated<T>(
    path: string,
    init?: RequestInit,
    retry = true,
  ): Promise<T> {
    let session = readBackendSession();
    if (!session) {
      throw new BackendApiError(
        "Authentication is required.",
        "UNAUTHORIZED",
        401,
        "missing_session",
      );
    }
    if (retry && session.accessTokenExpiresAt <= Date.now()) {
      await this.rotateRefreshToken();
      session = readBackendSession();
      if (!session) {
        throw new BackendApiError(
          "The session has expired. Sign in again.",
          "UNAUTHORIZED",
          401,
          "missing_session",
        );
      }
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    try {
      return await this.raw<T>(path, {
        ...init,
        headers,
      });
    } catch (error) {
      if (
        retry &&
        error instanceof BackendApiError &&
        error.status === 401
      ) {
        await this.rotateRefreshToken();
        return this.authenticated<T>(path, init, false);
      }
      throw error;
    }
  }

  private async authenticatedResponse(
    path: string,
    init?: RequestInit,
    retry = true,
  ): Promise<Response> {
    let session = readBackendSession();
    if (!session) {
      throw new BackendApiError(
        "Authentication is required.",
        "UNAUTHORIZED",
        401,
        "missing_session",
      );
    }
    if (retry && session.accessTokenExpiresAt <= Date.now()) {
      await this.rotateRefreshToken();
      session = readBackendSession();
      if (!session) {
        throw new BackendApiError(
          "The session has expired. Sign in again.",
          "UNAUTHORIZED",
          401,
          "missing_session",
        );
      }
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    try {
      return await this.rawResponse(path, { ...init, headers });
    } catch (error) {
      if (
        retry &&
        error instanceof BackendApiError &&
        error.status === 401
      ) {
        await this.rotateRefreshToken();
        return this.authenticatedResponse(path, init, false);
      }
      throw error;
    }
  }

  async login(request: BackendLoginRequest): Promise<BackendTokenResponse> {
    const response = await this.raw<BackendTokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(request),
    });
    writeBackendSession(sessionFromTokenResponse(response));
    return response;
  }

  async restoreSession(): Promise<BackendUser | null> {
    if (!readBackendSession()) return null;
    const user = await this.authenticated<BackendUser>("/api/v1/auth/me");
    const session = readBackendSession();
    if (session) writeBackendSession({ ...session, user });
    return user;
  }

  async logout(): Promise<void> {
    const session = readBackendSession();
    try {
      if (session) {
        await this.raw<void>("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: session.refreshToken }),
        });
      }
    } finally {
      clearBackendSession();
    }
  }

  listCases(): Promise<BackendCase[]> {
    return this.authenticated("/api/v1/cases");
  }

  getCase(caseId: string): Promise<BackendCase> {
    return this.authenticated(`/api/v1/cases/${encodeURIComponent(caseId)}`);
  }

  createCase(request: BackendCaseCreate): Promise<BackendCase> {
    return this.authenticated("/api/v1/cases", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  listDocuments(caseId: string): Promise<BackendDocumentMetadata[]> {
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents`,
    );
  }

  createDocumentMetadata(
    caseId: string,
    request: BackendDocumentMetadataCreate,
  ): Promise<BackendDocumentMetadata> {
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents`,
      { method: "POST", body: JSON.stringify(request) },
    );
  }

  uploadDocument(
    caseId: string,
    file: File,
    category: string,
  ): Promise<BackendDocumentDetail> {
    const body = new FormData();
    body.append("file", file, file.name);
    body.append("category", category);
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents/upload`,
      { method: "POST", body },
    );
  }

  getDocumentDetail(
    caseId: string,
    documentId: string,
  ): Promise<BackendDocumentDetail> {
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}`,
    );
  }

  async downloadDocument(caseId: string, documentId: string): Promise<Blob> {
    const response = await this.authenticatedResponse(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}/download`,
    );
    return response.blob();
  }

  reprocessDocument(
    caseId: string,
    documentId: string,
  ): Promise<BackendDocumentDetail> {
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}/reprocess`,
      { method: "POST" },
    );
  }

  deleteDocumentMetadata(caseId: string, documentId: string): Promise<void> {
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE" },
    );
  }

  listAuditEvents(caseId: string): Promise<BackendAuditEvent[]> {
    return this.authenticated(
      `/api/v1/cases/${encodeURIComponent(caseId)}/audit-events`,
    );
  }
}

const mockUser: BackendUser = {
  id: "mock-attorney",
  organization_id: "mock-organization",
  email: "attorney@legalbridge.demo",
  full_name: "Demo Attorney",
  role: "attorney",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export class MockLegalBridgeClient implements LegalBridgeClient {
  readonly mode = "mock" as const;

  async login(request: BackendLoginRequest): Promise<BackendTokenResponse> {
    if (
      request.organization_slug !== "legalbridge-demo" ||
      request.email.trim().toLowerCase() !== mockUser.email ||
      request.password !== "LegalBridge@2026"
    ) {
      throw new BackendApiError(
        "Invalid organisation, email, or password.",
        "UNAUTHORIZED",
        401,
        "invalid_credentials",
      );
    }
    const response: BackendTokenResponse = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      user: mockUser,
    };
    writeBackendSession(sessionFromTokenResponse(response));
    return response;
  }

  async restoreSession(): Promise<BackendUser | null> {
    return readBackendSession()?.user ?? null;
  }

  async logout(): Promise<void> {
    clearBackendSession();
  }

  async listCases(): Promise<BackendCase[]> {
    return [
      {
        id: DEMO_CASE_ID,
        organization_id: mockUser.organization_id,
        case_number: seedCase.reference,
        title: seedCase.title,
        description: seedCase.allegation,
        court_name: seedCase.court,
        jurisdiction: seedCase.jurisdiction,
        allegation_type: "Synthetic property allegation",
        status: seedCase.status,
        created_by_id: mockUser.id,
        assigned_attorney_id: mockUser.id,
        created_at: seedCase.createdAt,
        updated_at: seedCase.createdAt,
      },
    ];
  }

  getCase(): Promise<BackendCase> {
    return this.listCases().then((cases) => cases[0]!);
  }

  createCase(): Promise<BackendCase> {
    throw new BackendApiError(
      "Mock case creation remains browser-local.",
      "SERVER_ERROR",
      501,
      "mock_local_only",
    );
  }

  async listDocuments(): Promise<BackendDocumentMetadata[]> {
    return [];
  }

  createDocumentMetadata(): Promise<BackendDocumentMetadata> {
    throw new BackendApiError(
      "Mock document metadata remains browser-local.",
      "SERVER_ERROR",
      501,
      "mock_local_only",
    );
  }

  uploadDocument(): Promise<BackendDocumentDetail> {
    throw new BackendApiError(
      "Binary upload requires HTTP data mode.",
      "SERVER_ERROR",
      501,
      "mock_upload_unavailable",
    );
  }

  getDocumentDetail(): Promise<BackendDocumentDetail> {
    throw new BackendApiError(
      "Stored source pages require HTTP data mode.",
      "SERVER_ERROR",
      501,
      "mock_source_pages_unavailable",
    );
  }

  downloadDocument(): Promise<Blob> {
    throw new BackendApiError(
      "Original download requires HTTP data mode.",
      "SERVER_ERROR",
      501,
      "mock_download_unavailable",
    );
  }

  reprocessDocument(): Promise<BackendDocumentDetail> {
    throw new BackendApiError(
      "Reprocessing requires HTTP data mode.",
      "SERVER_ERROR",
      501,
      "mock_reprocess_unavailable",
    );
  }

  async deleteDocumentMetadata(): Promise<void> {
    return undefined;
  }

  async listAuditEvents(): Promise<BackendAuditEvent[]> {
    return [];
  }
}

export function createLegalBridgeClient(): LegalBridgeClient {
  if (publicEnv.dataMode === "mock") return new MockLegalBridgeClient();
  if (publicEnv.dataMode === "http" && publicEnv.apiBaseUrl) {
    return new HttpLegalBridgeClient(publicEnv.apiBaseUrl);
  }
  throw new BackendApiError(
    publicEnv.configurationError ?? "Invalid frontend configuration.",
    "INVALID_CONFIGURATION",
    0,
    "invalid_configuration",
  );
}

export const legalBridgeClient = createLegalBridgeClient();

export const queryKeys = {
  cases: ["cases"] as const,
  case: (caseId: string) => ["cases", caseId] as const,
  documents: (caseId: string) => ["cases", caseId, "documents"] as const,
  audit: (caseId: string) => ["cases", caseId, "audit"] as const,
};
