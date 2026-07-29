import type { BackendUser } from "@/lib/api/backend-types";

const SESSION_KEY = "legalbridge-http-session";

export interface StoredBackendSession {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
}

function isStoredSession(value: unknown): value is StoredBackendSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredBackendSession>;
  return (
    typeof candidate.accessToken === "string" &&
    typeof candidate.refreshToken === "string" &&
    typeof candidate.accessTokenExpiresAt === "number" &&
    Boolean(candidate.user) &&
    typeof candidate.user?.id === "string" &&
    typeof candidate.user?.email === "string"
  );
}

export function readBackendSession(): StoredBackendSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed)) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeBackendSession(session: StoredBackendSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearBackendSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

export function sessionFromTokenResponse(
  response: {
    user: BackendUser;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  },
): StoredBackendSession {
  return {
    user: response.user,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresAt: Date.now() + response.expires_in * 1000,
  };
}
