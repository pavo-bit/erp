"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string; email: string; name: string; role: string; schoolId?: string;
  teacher?: { id: string; department?: string; designation?: string; subjects?: string[] };
}

interface AuthContextType {
  user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, login: async () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data?.role === "TEACHER") setUser(data.data);
        else { setUser(null); router.push("/login"); }
      })
      .catch(() => { setUser(null); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Login failed");
    if (data.data.user.role !== "TEACHER") throw new Error("Teacher access only");
    setUser(data.data.user);
    router.push("/portal");
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
