export async function apiCall(endpoint: string, method = "GET", body?: any) {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const targetUrl = endpoint.startsWith("/api/v1") ? endpoint : endpoint.replace("/api", "/api/v1");
  let response = await fetch(targetUrl, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (response.status === 401) {
    const refreshRes = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" });
    if (refreshRes.ok) {
      response = await fetch(targetUrl, {
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
