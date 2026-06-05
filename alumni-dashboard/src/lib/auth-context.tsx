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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
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

      const res = await fetch("/api/auth/me", {
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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    setUser(null);
    router.push("/login");
  };

  // Route protection — only runs after initial auth check completes
  useEffect(() => {
    if (!initialCheckDone) return;

    const publicPaths = ["/", "/login"];
    const isPublic = publicPaths.includes(pathname);

    // Always allow the login page to show
    if (pathname === "/login") {
      if (user && (user.role === "ALUMNI" || user.role === "ADMIN")) {
        // Already authenticated alumni/admin — send to dashboard
        router.push("/alumni");
      }
      // If no user, just show the login page
      return;
    }

    // Redirect to local login page if not authenticated and trying to access protected route
    if (!user && !isPublic) {
      router.push("/login");
      return;
    }

    // Role-based route protection
    if (user) {
      const role = user.role.toLowerCase();
      // Allow ALUMNI and ADMIN to view the Alumni dashboard
      if (role !== "alumni" && role !== "admin") {
        window.location.href = "http://localhost:3000";
        return;
      }
    }
  }, [user, initialCheckDone, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        setUser(data.data.user);
        return { success: true, role: data.data.user.role, token: data.data.token };
      }

      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Network error — is the backend running?" };
    }
  };



  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
