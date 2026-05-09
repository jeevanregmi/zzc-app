import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const BASE_URL = "https://zzc.jeevanregmi.com.np";

export const metadata: Metadata = {
  title: "नेपालको Gen Z बचत तथा लगानी",
  description:
    "नेपालका EPF, CIT र SSF योजनाहरू एकै ठाउँमा — तुलना गर्नुस्, क्यालकुलेटर चलाउनुस् र आफ्नो योग्यता थाहा पाउनुस्।",
  keywords: [
    "EPF Nepal",
    "CIT Nepal",
    "SSF Nepal",
    "नेपाल बचत योजना",
    "लगानी",
    "सेवानिवृत्ति",
    "पेन्सन",
    "युवा बचत नेपाल",
    "कर्मचारी सञ्चय कोष",
    "नागरिक लगानी कोष",
    "सामाजिक सुरक्षा कोष",
    "Zeneration Z Chautari",
  ],
  openGraph: {
    title: "ZZC — नेपालको Gen Z बचत तथा लगानी",
    description:
      "नेपालका EPF, CIT र SSF योजनाहरू एकै ठाउँमा — तुलना, क्यालकुलेटर र योग्यता जाँच।",
    url: BASE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ZZC — Zeneration Z Chautari",
  url: BASE_URL,
  description:
    "Nepal's Gen Z fintech education platform for EPF, CIT, and SSF investment schemes.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
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
