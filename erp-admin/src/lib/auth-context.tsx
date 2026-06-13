"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar?: string;
  student?: Record<string, unknown>;
  parent?: Record<string, unknown>;
  alumni?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string; token?: string; requires2FA?: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, otp: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  verify2FA: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch("/api/v1/auth/me", {
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      // Network error, timeout, or backend not running — treat as not authenticated
      setUser(null);
    } finally {
      setLoading(false);
      setInitialCheckDone(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    setUser(null);
    router.push("/");
  };

  // Route protection — only runs after initial auth check completes
  useEffect(() => {
    if (!initialCheckDone) return;

    const publicPaths = ["/", "/login"];
    const isPublic = publicPaths.includes(pathname);

    // Always allow the login page to show — never redirect away from /login
    // unless the user is truly authenticated (token validated by API)
    if (pathname === "/login") {
      if (user) {
        // User explicitly navigated to login page while authenticated
        // Force logout to allow re-authentication instead of auto-redirecting
        logout();
      }
      // If no user, just show the login page — don't redirect
      return;
    }

    // Redirect to root if not authenticated and trying to access protected route
    if (!user && !isPublic) {
      router.push("/");
      return;
    }

    // Role-based route protection
    if (user) {
      const role = user.role.toLowerCase();
      const targetRole = role === "super_admin" || role === "erp_admin" ? "admin" : role;
      
      // If authenticated user is on the root login page, redirect to dashboard
      if (pathname === "/") {
        router.push(`/${targetRole}`);
        return;
      }

      const protectedPrefixes = ["/admin", "/student", "/parent", "/alumni"];
      const matchedPrefix = protectedPrefixes.find((p) => pathname.startsWith(p));

      if (matchedPrefix && !pathname.startsWith(`/${targetRole}`)) {
        router.push(`/${targetRole}`);
      }
    }
  }, [user, initialCheckDone, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.requires2FA) {
        return { success: true, requires2FA: true, tempToken: data.tempToken };
      }

      if (data.success) {
        setUser(data.data.user);
        return { success: true, role: data.data.user.role, token: data.data.token };
      }

      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Network error — is the backend running?" };
    }
  };

  const verify2FA = async (tempToken: string, otp: string) => {
    try {
      const res = await fetch("/api/v1/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tempToken, otp }),
      });

      const data = await res.json();

      if (data.success) {
        setUser(data.data.user);
        return { success: true, role: data.data.user.role };
      }

      return { success: false, error: data.error || "Invalid OTP" };
    } catch {
      return { success: false, error: "Network error during 2FA" };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verify2FA, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
