+
  "use client";

import useSWR, { mutate as globalMutate } from "swr";

async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem("csrfToken");
    if (token && !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase())) headers.set("X-CSRF-Token", token);
  }
  const response = await fetch(input, { ...init, headers });
  const token = response.headers.get("X-CSRF-Token");
  if (token && typeof window !== "undefined") window.sessionStorage.setItem("csrfToken", token);
  return response;
}

async function fetchWithAuthRetry(input: RequestInfo | URL, init: RequestInit = {}) {
  let response = await fetchWithCsrf(input, init);
  if (response.status !== 401) return response;
  let refresh: Response;
  try {
    refresh = await fetchWithCsrf("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
  } catch {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.assign("/login");
    return response;
  }
  if (!refresh.ok) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.assign("/login");
    return response;
  }
  return fetchWithCsrf(input, init);
}

// Fetcher with credentials for cookie-based auth
const fetcher = async (url: string) => {
  const res = await fetchWithAuthRetry(url, { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  const data = await res.json();
  return data.data ?? data;
};

export async function apiCall(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "POST", body?: unknown) {
  const opts: RequestInit = {
    method,
    credentials: "include",
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  };
  let res: Response;
  try {
    res = await fetchWithAuthRetry(url, opts);
  } catch {
    throw new Error("Network error — check your connection and try again");
  }
  let data;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new Error("Server error (" + res.status + ") — please try again");
    return null;
  }
  if (!res.ok || !data.success) throw new Error(data.error || "Request failed (" + res.status + ")");
  return data.data ?? null;
}
export function invalidate(key: string) { globalMutate(key); }
export function invalidateAll(prefix: string) {
  globalMutate((key) => typeof key === "string" && key.startsWith(prefix), undefined, { revalidate: true });
}

// ─── Platform Hooks ───
export function useSchools(params?: string) { return useSWR("/api/v1/schools" + (params ? "?" + params : ""), fetcher); }
export function useSchoolHealthUsage(schoolId?: string) { return useSWR(schoolId ? `/api/v1/platform/schools/${schoolId}/health-usage` : null, fetcher); }
export function usePlatformSchoolsHealthUsage() { return useSWR("/api/v1/platform/schools/health-usage", fetcher); }
export function useSchoolModules(schoolId?: string) { return useSWR(schoolId ? `/api/v1/schools/${schoolId}/modules` : null, fetcher); }
export function useActiveSupportSession(schoolId?: string) { return useSWR(schoolId ? `/api/v1/platform/support-sessions/school/${schoolId}` : null, fetcher); }
export function useSecurityAuditLogs() { return useSWR("/api/v1/saas/security/audit-logs", fetcher); }
export function useSuperAdminStats() { return useSWR("/api/v1/stats/detailed", fetcher); }
export function useDataRetentionPolicies() { return useSWR("/api/v1/admin/governance-workflows/retention-policies", fetcher); }
export function useSaasMetrics() { return useSWR("/api/v1/saas/metrics", fetcher); }
export function useShfiOverview() { return useSWR("/api/v1/shfi/health/overview", fetcher); }
export function useShfiIncidents() { return useSWR("/api/v1/shfi/incidents", fetcher); }
export function useAnalytics() { return useSWR("/api/v1/stats/detailed", fetcher); }
export function useFinanceStats() { return useSWR("/api/v1/stats/finance", fetcher); }
export function usePublicStats() { return useSWR("/api/v1/stats/public", fetcher); }
export function useSearch(query: string) { return useSWR(query.length >= 2 ? `/api/v1/search?q=${query}` : null, fetcher); }
export function useFinancialClosePeriods() { return useSWR("/api/v1/finance/governance/periods", fetcher); }
export function useLedgerAccounts() { return useSWR("/api/v1/finance/governance/accounts", fetcher); }
