import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "../components/NavBar";
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
  metadataBase: new URL("https://zzc.jeevanregmi.com.np"),
  title: {
    default: "ZZC — नेपालको नागरिक र भक्ति ज्ञान चौतारी",
    template: "%s | ZZC",
  },
  description:
    "Nepal's AI-native Civic & Spiritual Intelligence Chautari. Verified documents, sacred texts, and AI-assisted intelligence — explained simply for Nepal's new generation.",
  keywords: [
    "Nepal civic intelligence",
    "नेपाल संविधान",
    "Nepal Constitution",
    "Nepal government reports",
    "Bhakti Chautari Nepal",
    "Sanskrit shloka Nepal",
    "नागरिक ज्ञान नेपाल",
    "ZZC",
    "Zeneration Z Chautari",
    "Nepal AI platform",
  ],
  authors: [{ name: "Zeneration Z Chautari" }],
  creator: "ZZC — Zeneration Z Chautari",
  openGraph: {
    type: "website",
    locale: "ne_NP",
    url: "https://zzc.jeevanregmi.com.np",
    siteName: "ZZC — Zeneration Z Chautari",
    title: "ZZC — नेपालको नागरिक र भक्ति ज्ञान चौतारी",
    description:
      "Nepal's civic & spiritual intelligence chautari. Constitutional intelligence, government reports, sacred texts — source-backed and founder-verified.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZZC — नेपालको नागरिक र भक्ति ज्ञान चौतारी",
    description:
      "Nepal's AI-native Civic & Spiritual Intelligence Chautari.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ne"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white pb-16 sm:pb-0">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
