"use client";

import useSWR from "swr";

const fetcher = async (url: string) => {
  let res = await fetch(url, { credentials: "include" });

  if (res.status === 401) {
    const refreshRes = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) res = await fetch(url, { credentials: "include" });
  }

  if (!res.ok) throw new Error("Request failed");
  const data = await res.json();
  return data.data ?? data;
};

export async function apiCall(url: string, method: "POST" | "PUT" | "DELETE" = "POST", body?: unknown) {
  let res = await fetch(url, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const refreshRes = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      res = await fetch(url, {
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

export function useTeacherStats() { return useSWR("/api/v1/stats/teacher", fetcher); }
export function useTeacherClasses() { return useSWR("/api/v1/teacher/classes", fetcher); }
export function useTeacherLeaves() { return useSWR("/api/v1/teacher/leaves", fetcher); }
