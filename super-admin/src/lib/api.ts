"use client";

import useSWR from "swr";

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

const fetcher = async (url: string) => {
  let res = await fetchWithCsrf(url, { credentials: "include" });
  
  if (res.status === 401) {
    const refreshRes = await fetchWithCsrf("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) res = await fetchWithCsrf(url, { credentials: "include" });
  }

  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();
  return data.data ?? data;
};

export async function apiCall(url: string, method: "POST" | "PUT" | "DELETE" = "POST", body?: unknown) {
  let res = await fetchWithCsrf(url, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const refreshRes = await fetchWithCsrf("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      res = await fetchWithCsrf(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data ?? null;
}

export function useSchools() { return useSWR("/api/v1/schools", fetcher); }
export function useSuperAdminStats() { return useSWR("/api/v1/stats/super-admin", fetcher); }
export function useFinanceStats() { return useSWR("/api/v1/stats/finance", fetcher); }
export function useSubscriptions() { return useSWR("/api/v1/subscriptions/plans", fetcher); }
export function useAuditLogs() { return useSWR("/api/v1/audit/logs", fetcher); }
export function useDataRetentionPolicies() { return useSWR("/api/v1/admin/governance-workflows/retention-policies", fetcher); }
export function useGovernanceWorkflows() { return useSWR("/api/v1/admin/governance-workflows/custom-workflows", fetcher); }
