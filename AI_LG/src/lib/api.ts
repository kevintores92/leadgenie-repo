import { authHeaders } from "./session";

function getApiBaseUrl(): string {
  // Empty string means "same origin".
  const base = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return (base ?? "").replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit & { includeOrgId?: boolean }) {
  const { includeOrgId, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);

  const auth = authHeaders({ includeOrgId: includeOrgId ?? true });
  for (const [key, value] of Object.entries(auth)) headers.set(key, value);

  return fetch(apiUrl(path), { ...rest, headers });
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit & { includeOrgId?: boolean },
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function apiDownloadBlob(path: string): Promise<Blob> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return await res.blob();
}
