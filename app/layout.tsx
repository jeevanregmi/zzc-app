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
  metadataBase: new URL("https://zzc.jeevanregmi.com.np"),
  title: {
    default: "ZZC — Zeneration Z Chautari",
    template: "%s | ZZC — Zeneration Z Chautari",
  },
  description:
    "नेपालको Gen Z को लागि EPF, CIT र SSF लगानी योजनाहरू — तुलना, क्यालकुलेटर र योग्यता जाँच एकै ठाउँमा।",
  keywords: [
    "EPF",
    "CIT",
    "SSF",
    "नेपाल बचत",
    "लगानी योजना",
    "सेवानिवृत्ति",
    "पेन्सन",
    "Gen Z Nepal",
    "Zeneration Z Chautari",
    "कर्मचारी सञ्चय कोष",
    "नागरिक लगानी कोष",
    "सामाजिक सुरक्षा कोष",
  ],
  authors: [{ name: "ZZC Team" }],
  creator: "ZZC — Zeneration Z Chautari",
  openGraph: {
    type: "website",
    locale: "ne_NP",
    url: "https://zzc.jeevanregmi.com.np",
    siteName: "ZZC — Zeneration Z Chautari",
    title: "ZZC — Zeneration Z Chautari",
    description:
      "नेपालको Gen Z को लागि EPF, CIT र SSF लगानी योजनाहरू — तुलना, क्यालकुलेटर र योग्यता जाँच।",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZZC — Zeneration Z Chautari",
    description:
      "नेपालको Gen Z को लागि EPF, CIT र SSF लगानी योजनाहरू।",
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
      <body className="min-h-full flex flex-col bg-black text-white">
        <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <Link href="/" className="text-xl sm:text-2xl font-black text-green-400 tracking-tight shrink-0">
              ZZC
            </Link>
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1 text-sm font-semibold">
              <Link href="/" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                योजनाहरू
              </Link>
              <Link href="/eligibility" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                योग्यता
              </Link>
              <Link href="/compare" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                तुलना
              </Link>
              <Link href="/calculator" className="text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-2 rounded-xl transition">
                क्यालकुलेटर
              </Link>
              <Link href="/recommend" className="text-green-400 hover:text-white hover:bg-green-900/30 px-3 py-2 rounded-xl transition">
                AI सिफारिस
              </Link>
              <Link href="/admin" className="text-zinc-600 hover:text-green-400 hover:bg-zinc-900 px-3 py-2 rounded-xl transition text-xs ml-4">
                Admin
              </Link>
            </div>
            {/* Mobile nav — key actions only */}
            <div className="flex sm:hidden items-center gap-1 text-xs font-semibold overflow-x-auto scrollbar-none">
              <Link href="/" className="text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg transition shrink-0">
                योजना
              </Link>
              <Link href="/calculator" className="text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg transition shrink-0">
                Calculator
              </Link>
              <Link href="/recommend" className="text-green-400 bg-green-900/20 hover:bg-green-900/40 px-2 py-1.5 rounded-lg transition shrink-0">
                AI
              </Link>
              <Link href="/compare" className="text-zinc-500 hover:text-white px-2 py-1.5 rounded-lg transition shrink-0">
                Compare
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
