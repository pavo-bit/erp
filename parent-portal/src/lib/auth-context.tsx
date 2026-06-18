"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiCall } from "./api-hooks";

export interface ParentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  guardian?: {
    id: string;
    schoolId: string;
    primaryName: string;
    students: {
      id: string;
      name: string;
      rollNo: string;
    }[];
  };
}

interface AuthContextType {
  user: ParentUser | null;
  loading: boolean;
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string) => void;
  login: (token: string, user: ParentUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ParentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      try {
        const res = await apiCall("/api/v1/auth/me");
        if (res.success && res.data.role === "PARENT") {
          setUser(res.data);
          if (res.data.guardian?.students?.length > 0) {
            setSelectedStudentId(res.data.guardian.students[0].id);
          }
        } else {
          throw new Error("Not a parent");
        }
      } catch (e) {
        setUser(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, [pathname, router]);

  const login = (token: string, userData: ParentUser) => {
    setUser(userData);
    if (userData.guardian?.students?.length) {
      setSelectedStudentId(userData.guardian.students[0].id);
    }
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await apiCall("/api/v1/auth/logout", "POST");
    } catch (e) {}
    setUser(null);
    setSelectedStudentId(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, selectedStudentId, setSelectedStudentId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
