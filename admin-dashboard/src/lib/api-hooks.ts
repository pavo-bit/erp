"use client";

import useSWR, { mutate as globalMutate } from "swr";

// Fetcher with credentials for cookie-based auth
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  const data = await res.json();
  return data.data ?? data;
};

export async function apiCall(url: string, method: "POST" | "PUT" | "DELETE" = "POST", body?: unknown) {
  const opts: RequestInit = {
    method,
    credentials: "include",
    headers: body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new Error("Network error — check your connection and try again");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    // Response was not JSON (e.g., proxy error, HTML error page)
    if (!res.ok) {
      throw new Error(`Server error (${res.status}) — please try again`);
    }
    // Non-JSON success response — return null
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
export function useNotices(params?: string) { return useSWR(`/api/notices${params ? `?${params}` : ""}`, fetcher); }
export function useEvents(params?: string) { return useSWR(`/api/events${params ? `?${params}` : ""}`, fetcher); }
export function useStudents(params?: string) { return useSWR(`/api/students${params ? `?${params}` : ""}`, fetcher); }
export function useFees(params?: string) { return useSWR(`/api/fees${params ? `?${params}` : ""}`, fetcher); }
export function useResults(params?: string) { return useSWR(`/api/results${params ? `?${params}` : ""}`, fetcher); }
export function useAttendance(params?: string) { return useSWR(`/api/attendance${params ? `?${params}` : ""}`, fetcher); }
export function useAssignments(params?: string) { return useSWR(`/api/assignments${params ? `?${params}` : ""}`, fetcher); }
export function useMessages(box: "inbox" | "sent" = "inbox") { return useSWR(`/api/messages?box=${box}`, fetcher); }
export function useGallery(category?: string) { return useSWR(`/api/gallery${category ? `?category=${category}` : ""}`, fetcher); }
export function useFaculty() { return useSWR("/api/faculty", fetcher); }
export function useAlumni(params?: string) { return useSWR(`/api/alumni${params ? `?${params}` : ""}`, fetcher); }
export function useContributions(alumniId?: string) { return useSWR(`/api/alumni/contributions${alumniId ? `?alumniId=${alumniId}` : ""}`, fetcher); }
export function useTestimonials() { return useSWR("/api/testimonials", fetcher); }
export function useSiteContent(section?: string) { return useSWR(`/api/site-content${section ? `?section=${section}` : ""}`, fetcher); }
export function useAnalytics() { return useSWR("/api/analytics", fetcher); }
export function usePublicStats() { return useSWR("/api/stats/public", fetcher); }
