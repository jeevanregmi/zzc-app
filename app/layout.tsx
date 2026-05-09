import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "ZZC — Nepal Fintech Intelligence",
  description: "Compare Nepal's top savings, pension, and investment schemes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-black text-green-400 tracking-tight">
              ZZC
            </Link>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <Link href="/" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                Schemes
              </Link>
              <Link href="/eligibility" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                Eligibility
              </Link>
              <Link href="/compare" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                Compare
              </Link>
              <Link href="/calculator" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                Calculator
              </Link>
              <Link href="/admin" className="text-zinc-600 hover:text-green-400 hover:bg-zinc-900 px-3 py-2 rounded-xl transition text-xs ml-4">
                Admin
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
