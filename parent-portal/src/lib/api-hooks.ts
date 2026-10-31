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

export async function apiCall(endpoint: string, method = "GET", body?: any) {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const targetUrl = endpoint.startsWith("/api/v1") ? endpoint : endpoint.replace("/api", "/api/v1");
  let response = await fetchWithCsrf(targetUrl, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (response.status === 401) {
    const refreshRes = await fetchWithCsrf("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      response = await fetchWithCsrf(targetUrl, {
        method,
        headers,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
    }
  }

  if (!response.ok) {
    let errorMsg = "API Error";
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}
