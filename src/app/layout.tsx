import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UL Platform - Unsupervised Learning",
  description: "Modern unsupervised learning platform built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui for advanced data analysis.",
  keywords: ["UL", "Unsupervised Learning", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "Machine Learning", "Data Analysis", "React"],
  authors: [{ name: "UL Team" }],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='20' font-weight='bold' text-anchor='middle' dy='.3em' fill='%23000'%3EUL%3C/text%3E%3C/svg%3E",
  },
  openGraph: {
    title: "UL Platform - Unsupervised Learning",
    description: "Advanced unsupervised learning platform for data analysis and machine learning",
    siteName: "UL Platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UL Platform - Unsupervised Learning",
    description: "Advanced unsupervised learning platform for data analysis and machine learning",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
