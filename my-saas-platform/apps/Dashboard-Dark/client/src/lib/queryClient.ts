import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Default to Vite proxy path so dev server can forward `/api/*` to backend.
const API_URL = import.meta.env.VITE_API_URL || '/api';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    try {
      // surface server response body to browser console for easier debugging
      console.warn('[apiRequest] response not ok', { status: res.status, statusText: res.statusText, body: text });
    } catch (e) {
      // ignore logging errors
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const token = localStorage.getItem('auth_token');
  // debug log for network troubleshooting
  console.debug('[apiRequest] request', { method, url, hasBody: !!data });

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey[0] as string;
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;
    const token = localStorage.getItem('auth_token');
    
    const res = await fetch(url, {
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
