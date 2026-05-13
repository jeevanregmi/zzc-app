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
      <body className="min-h-full flex flex-col bg-black text-white pb-16 sm:pb-0">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
