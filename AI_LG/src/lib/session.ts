export type AuthSession = {
  token: string;
  userId: string;
  orgId: string;
  activeBrandId?: string | null;
};

const STORAGE_KEY = "lg.session";

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.userId || !parsed?.orgId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getAuthToken(): string | null {
  return getSession()?.token ?? null;
}

export function getOrganizationId(): string | null {
  return getSession()?.orgId ?? null;
}

export function authHeaders(options?: { includeOrgId?: boolean }): Record<string, string> {
  const includeOrgId = options?.includeOrgId ?? true;
  const session = getSession();
  const headers: Record<string, string> = {};
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
  if (includeOrgId && session?.orgId) headers["x-organization-id"] = session.orgId;
  return headers;
}
