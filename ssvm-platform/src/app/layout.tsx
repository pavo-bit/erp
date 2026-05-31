import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saraswati Shishu Vidya Mandir — College Square, Cuttack",
  description:
    "Rooted in Indian values, driven by excellence. Saraswati Shishu Vidya Mandir, College Square, Cuttack — Odisha's premier educational institution since 1987. Nursery to Class XII under Vidya Bharati.",
  keywords: [
    "Saraswati Shishu Vidya Mandir",
    "SSVM Cuttack",
    "College Square School",
    "Vidya Bharati",
    "Best School in Cuttack",
    "Odisha Board School",
  ],
  openGraph: {
    title: "Saraswati Shishu Vidya Mandir — College Square, Cuttack",
    description:
      "Shaping Young Minds for a Brighter Tomorrow. 70+ years of academic excellence rooted in Indian values.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
