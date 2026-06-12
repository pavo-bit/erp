"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiCall } from "./api-hooks";

export interface StudentAuth {
  id: string;
  name: string;
  admissionNo: string;
  role: string;
}

interface AuthContextType {
  student: StudentAuth | null;
  loading: boolean;
  login: (token: string, student: StudentAuth) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentAuth | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function initAuth() {
      try {
        const res = await apiCall("/api/auth/me");
        if (res.success && res.data.role === "STUDENT") {
          // Since the endpoint /api/auth/me returns the user, but we logged in via /api/auth/student/login
          // wait, /api/auth/me returns the standard User. But the student token has studentId as `userId` and role `STUDENT`.
          // We need to fetch the student profile directly.
          // For the scope of this portal, we'll rely on the token data or a specific me endpoint if needed.
          // Let's just set the student using the token data we stored, or fetch via /api/students/:id.
          
          setStudent(res.data);
        } else {
          throw new Error("Not logged in as student");
        }
      } catch (e) {
        setStudent(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, [pathname, router]);

  const login = (token: string, studentData: StudentAuth) => {
    setStudent(studentData);
    router.push("/checkout");
  };

  const logout = async () => {
    try {
      await apiCall("/api/auth/logout", "POST");
    } catch (e) {}
    setStudent(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ student, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
