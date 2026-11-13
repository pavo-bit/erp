import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall, ApiError } from "./api-hooks";

const storage = new Map<string, string>();
const fetchMock = vi.fn<typeof fetch>();
const assign = vi.fn();
function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers).entries()) } });
}
describe("portal API client", () => {
  beforeEach(() => {
    storage.clear(); fetchMock.mockReset(); assign.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }, location: { pathname: "/private", assign } });
  });
  it("stores response CSRF and sends it on a later non-GET request", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [] }, 200, { "X-CSRF-Token": "csrf-from-response" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { saved: true } }));
    await apiCall("/api/v1/items", "GET"); await apiCall("/api/v1/items", "POST", { name: "item" });
    const init = fetchMock.mock.calls[1][1] as RequestInit;
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("csrf-from-response");
  });
  it("refreshes after 401 and retries the original request exactly once", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Unauthorized" }, 401));
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { refreshed: true } }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }));
    await expect(apiCall("/api/v1/private", "GET")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/v1/private", "/api/v1/auth/refresh", "/api/v1/private"]);
  });
  it("redirects to login when refresh fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Unauthorized" }, 401));
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, error: "Refresh expired" }, 401));
    await expect(apiCall("/api/v1/private", "GET")).rejects.toThrow("Unauthorized");
    expect(assign).toHaveBeenCalledOnce(); expect(assign).toHaveBeenCalledWith("/login");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("retains ApiError status metadata", () => { expect(new ApiError("boom", 400).status).toBe(400); });
});
