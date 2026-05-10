import type { Metadata } from "next";
import RecommendClient from "./RecommendClient";

const BASE_URL = "https://zzc.jeevanregmi.com.np";

export const metadata: Metadata = {
  title: "AI लगानी सिफारिस",
  description:
    "तपाईंको उमेर, आय र जोखिम क्षमताको आधारमा Claude AI ले नेपालका उत्तम लगानी योजनाहरू — EPF, CIT, SSF, NEPSE र Beema — को सिफारिस गर्छ।",
  keywords: [
    "AI लगानी सिफारिस",
    "नेपाल लगानी सुझाव",
    "EPF CIT SSF सिफारिस",
    "लगानी योजना नेपाल",
    "कुन योजनामा लगानी गर्ने",
    "नेपाल वित्तीय सल्लाह",
    "AI financial advisor Nepal",
    "Gen Z लगानी",
  ],
  openGraph: {
    title: "AI लगानी सिफारिस | ZZC",
    description:
      "तपाईंको उमेर, आय र जोखिम क्षमताको आधारमा Claude AI ले नेपालका उत्तम लगानी योजनाहरू सिफारिस गर्छ।",
    url: `${BASE_URL}/recommend`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "AI लगानी सिफारिस — EPF, CIT, SSF, NEPSE, Beema",
  description:
    "Get AI-powered investment scheme recommendations for Nepal based on your age, income, and risk appetite.",
  url: `${BASE_URL}/recommend`,
  isPartOf: { "@type": "WebSite", url: BASE_URL, name: "ZZC — Zeneration Z Chautari" },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "गृहपृष्ठ", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "AI सिफारिस", item: `${BASE_URL}/recommend` },
    ],
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecommendClient />
    </>
  );
}
