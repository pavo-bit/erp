import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Portal - SSVM College Square",
  description: "Student portal for SSVM College Square",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
