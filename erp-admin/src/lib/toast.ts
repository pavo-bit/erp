export function toast(message: any): void {
  if (typeof window === "undefined") {
    // eslint-disable-next-line no-console
    console.log(message);
    return;
  }
  try {
    let container = document.getElementById("ssvm-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "ssvm-toast-container";
      container.style.cssText =
        "position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:360px;pointer-events:none;";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.textContent = String(message ?? "");
    el.style.cssText =
      "background:#1e293b;color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:14px;word-break:break-word;opacity:0;transition:opacity .2s;pointer-events:auto;";
    container.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => {
        try {
          el.remove();
        } catch {
          /* noop */
        }
      }, 200);
    }, 3500);
  } catch {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

if (typeof window !== "undefined") {
  (window as any).toast = toast;
  (globalThis as any).toast = toast;
}

declare global {
  function toast(message?: any): void;
  interface Window {
    toast?: (message?: any) => void;
  }
}

export default toast;