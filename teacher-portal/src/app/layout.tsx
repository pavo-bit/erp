import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSVM — Teacher Portal",
  description: "Teacher Portal — Attendance, Marks Entry, Timetable, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
