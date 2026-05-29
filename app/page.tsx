import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const BASE_URL = "https://zzc.jeevanregmi.com.np";

export const metadata: Metadata = {
  title: "ZZC — नेपालको नागरिक र भक्ति ज्ञान चौतारी",
  description:
    "Nepal's AI-native Civic & Spiritual Intelligence Chautari. Verified documents, sacred texts, and AI-assisted intelligence — explained simply for Nepal's new generation.",
  keywords: [
    "Nepal civic intelligence",
    "नेपाल संविधान",
    "Nepal Constitution",
    "Nepal government documents",
    "Bhakti Chautari",
    "Sanskrit shloka Nepal",
    "नागरिक ज्ञान",
    "ZZC",
    "Zeneration Z Chautari",
    "Nepal AI",
  ],
  openGraph: {
    title: "ZZC — नेपालको नागरिक र भक्ति ज्ञान चौतारी",
    description:
      "Nepal's civic & spiritual intelligence chautari. Source-backed. Founder-verified.",
    url: BASE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ZZC — Zeneration Z Chautari",
  url: BASE_URL,
  description:
    "Nepal's AI-native Civic & Spiritual Intelligence Chautari — constitutional intelligence, government reports, sacred texts, explained simply.",
  publisher: {
    "@type": "Organization",
    name: "Zeneration Z Chautari",
    url: BASE_URL,
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
