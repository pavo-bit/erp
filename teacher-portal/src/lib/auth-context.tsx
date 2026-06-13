"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string; email: string; name: string; role: string; schoolId?: string;
  teacher?: { id: string; department?: string; designation?: string; subjects?: string[] };
}

interface AuthContextType {
  user: User | null; 
  loading: boolean; 
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean; tempToken?: string }>; 
  verify2FA: (tempToken: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  login: async () => ({ success: false }), 
  verify2FA: async () => ({ success: false }),
  logout: () => {} 
});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data?.role === "TEACHER") setUser(data.data);
        else { setUser(null); router.push("/login"); }
      })
      .catch(() => { setUser(null); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (data.requires2FA) {
        return { success: true, requires2FA: true, tempToken: data.tempToken };
      }
      
      if (!data.success) return { success: false, error: data.error || "Login failed" };
      if (data.data.user.role !== "TEACHER") return { success: false, error: "Teacher access only" };
      
      setUser(data.data.user);
      router.push("/portal");
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const verify2FA = async (tempToken: string, otp: string) => {
    try {
      const res = await fetch("/api/v1/auth/verify-2fa", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, otp }),
      });
      const data = await res.json();
      
      if (!data.success) return { success: false, error: data.error || "Invalid OTP" };
      if (data.data.user.role !== "TEACHER") return { success: false, error: "Teacher access only" };
      
      setUser(data.data.user);
      router.push("/portal");
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = () => {
    fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, loading, login, verify2FA, logout }}>{children}</AuthContext.Provider>;
}
