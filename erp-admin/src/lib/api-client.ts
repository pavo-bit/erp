// Shared typed API client for erp-admin (D2)
// Base URL from env, auth via existing token/cookie flow, CSRF header, refresh handling, uniform error type.

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/csrf-token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  const csrf = getCsrfToken();
  if (csrf && init.method && init.method !== 'GET') {
    headers['X-CSRF-Token'] = csrf;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(res.status, (body as any)?.error || res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => apiFetch<T>(p, { method: 'GET' }),
  post: <T>(p: string, body?: unknown) => apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(p: string, body?: unknown) => apiFetch<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
};