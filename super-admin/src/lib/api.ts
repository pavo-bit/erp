"use client";

import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();
  return data.data ?? data;
};

export async function apiCall(url: string, method: "POST" | "PUT" | "DELETE" = "POST", body?: unknown) {
  const res = await fetch(url, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data ?? null;
}

export function useSchools() { return useSWR("/api/schools", fetcher); }
export function useSuperAdminStats() { return useSWR("/api/stats/super-admin", fetcher); }
export function useFinanceStats() { return useSWR("/api/stats/finance", fetcher); }
