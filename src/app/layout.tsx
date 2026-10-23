import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RelationshipOS",
  description: "A second brain for professional relationships, applications, and pipelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkConfigured = isClerkConfigured();

  if (clerkConfigured) {
    return (
      <ClerkProvider>
        <html
          lang="en"
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
        >
          <body className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans">
            {children}
          </body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5] font-sans">
        {children}
      </body>
    </html>
  );
}
