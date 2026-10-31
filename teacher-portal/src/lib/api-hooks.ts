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

export async function apiCall(url: string, method: "GET" | "POST" | "PUT" | "DELETE" = "POST", body?: unknown) {
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

export function useTeacherStats() { return useSWR("/api/v1/stats/teacher", fetcher); }
export function useTeacherClasses() { return useSWR("/api/v1/teacher/classes", fetcher); }
export function useTeacherLeaves() { return useSWR("/api/v1/teacher/leaves", fetcher); }

// Enterprise Bindings
export function useAssignments(params?: string) { return useSWR(`/api/v1/assignments${params ? `?${params}` : ""}`, fetcher); }
export function useClassAttendance(classId: string, date: string) { return useSWR(`/api/v1/attendance/class/${classId}?date=${date}`, fetcher); }
export function useDisciplinaryRecords(params?: string) { return useSWR(`/api/v1/discipline${params ? `?${params}` : ""}`, fetcher); }
