"use client";

import { PremiumAlumniLayout } from "@/components/PremiumAlumniLayout";

export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  return (
    <PremiumAlumniLayout>
      {children}
    </PremiumAlumniLayout>
  );
}
