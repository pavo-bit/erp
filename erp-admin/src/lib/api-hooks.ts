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

// Fetcher with credentials for cookie-based auth
const fetcher = async (url: string) => {
  let res = await fetchWithCsrf(url, { credentials: "include" });
  
  // Refresh token rotation on 401
  if (res.status === 401) {
    const refreshRes = await fetchWithCsrf("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      res = await fetchWithCsrf(url, { credentials: "include" });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  const data = await res.json();
  return data.data ?? data;
};

export async function apiCall(url: string, method: "GET" | "POST" | "PUT" | "DELETE" = "POST", body?: unknown) {
  const opts: RequestInit = {
    method,
    credentials: "include",
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetchWithCsrf(url, opts);
    
    // Refresh token rotation on 401
    if (res.status === 401) {
      const refreshRes = await fetchWithCsrf("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
      if (refreshRes.ok) {
        res = await fetchWithCsrf(url, opts);
      }
    }
  } catch {
    throw new Error("Network error — check your connection and try again");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`Server error (${res.status}) — please try again`);
    }
    return null;
  }

  if (!data.success) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data.data ?? null;
}

export function invalidate(key: string) { globalMutate(key); }
export function invalidateAll(prefix: string) {
  globalMutate((key) => typeof key === "string" && key.startsWith(prefix), undefined, { revalidate: true });
}

// ─── Hooks ───
export function useNotices(params?: string) { return useSWR(`/api/v1/notices${params ? `?${params}` : ""}`, fetcher); }
export function useEvents(params?: string) { return useSWR(`/api/v1/events${params ? `?${params}` : ""}`, fetcher); }
export function useStudents(params?: string) { return useSWR(`/api/v1/students${params ? `?${params}` : ""}`, fetcher); }
export function useTeachers(params?: string) { return useSWR(`/api/v1/teachers${params ? `?${params}` : ""}`, fetcher); }
export function useInvoices(params?: string) { return useSWR(`/api/v1/invoices${params ? `?${params}` : ""}`, fetcher); }
export function useResults(params?: string) { return useSWR(`/api/v1/results${params ? `?${params}` : ""}`, fetcher); }
export function useAttendance(params?: string) { return useSWR(`/api/v1/attendance${params ? `?${params}` : ""}`, fetcher); }
export function useTeacherAttendance(params?: string) { return useSWR(`/api/v1/attendance/teachers${params ? `?${params}` : ""}`, fetcher); }
export function useAssignments(params?: string) { return useSWR(`/api/v1/assignments${params ? `?${params}` : ""}`, fetcher); }
export function useGallery(category?: string) { return useSWR(`/api/v1/gallery${category ? `?category=${category}` : ""}`, fetcher); }
export function useFaculty() { return useSWR("/api/v1/faculty", fetcher); }
export function useAlumni(params?: string) { return useSWR(`/api/v1/alumni${params ? `?${params}` : ""}`, fetcher); }
export function useContributions(alumniId?: string) { return useSWR(`/api/v1/alumni/contributions${alumniId ? `?alumniId=${alumniId}` : ""}`, fetcher); }
export function useTestimonials() { return useSWR("/api/v1/testimonials", fetcher); }
export function useSiteContent(section?: string) { return useSWR(`/api/v1/site-content${section ? `?section=${section}` : ""}`, fetcher); }
export function useExams(params?: string) { return useSWR(`/api/v1/exams${params ? `?${params}` : ""}`, fetcher); }
export function useAdmissions(params?: string) { return useSWR(`/api/v1/admissions${params ? `?${params}` : ""}`, fetcher); }
export function useSalaries(params?: string) { return useSWR(`/api/v1/hr/salaries${params ? `?${params}` : ""}`, fetcher); }
export function useLeaves(params?: string) { return useSWR(`/api/v1/hr/leaves${params ? `?${params}` : ""}`, fetcher); }
export function useTimetable(params?: string) { return useSWR(`/api/v1/timetable${params ? `?${params}` : ""}`, fetcher); }
export function useNotifications(params?: string) { return useSWR(`/api/v1/notifications${params ? `?${params}` : ""}`, fetcher); }
export function useAnalytics() { return useSWR("/api/v1/stats/detailed", fetcher); }
export function useFinanceStats() { return useSWR("/api/v1/stats/finance", fetcher); }
export function usePublicStats() { return useSWR("/api/v1/stats/public", fetcher); }
export function useSearch(query: string) { return useSWR(query.length >= 2 ? `/api/v1/search?q=${query}` : null, fetcher); }

// Phase 11/12 specific
export function useAssets(params?: string) { return useSWR(`/api/v1/assets${params ? `?${params}` : ""}`, fetcher); }
export function useAssetCategories() { return useSWR(`/api/v1/assets/categories`, fetcher); }
export function useVendors() { return useSWR(`/api/v1/assets/vendors`, fetcher); }
export function useEnquiries(params?: string) { return useSWR(`/api/v1/reception/enquiries${params ? `?${params}` : ""}`, fetcher); }
export function useVisitors(params?: string) { return useSWR(`/api/v1/reception/visitors${params ? `?${params}` : ""}`, fetcher); }
export function useLibraryBooks(params?: string) { return useSWR(`/api/v1/library/books${params ? `?${params}` : ""}`, fetcher); }
export function useLibraryTransactions(params?: string) { return useSWR(`/api/v1/library/transactions${params ? `?${params}` : ""}`, fetcher); }

// Phase 4-7 Enterprise 
export function useFinancialClosePeriods() { return useSWR("/api/v1/finance/governance/close-periods", fetcher); }
export function useLedgerAccounts() { return useSWR("/api/v1/finance/governance/accounts", fetcher); }
