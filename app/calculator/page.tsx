import type { Metadata } from "next";
import CalculatorPage from "./CalculatorClient";

const BASE_URL = "https://zzc.jeevanregmi.com.np";

export const metadata: Metadata = {
  title: "वित्तीय क्यालकुलेटर",
  description:
    "SIP, सेवानिवृत्ति, ऋण EMI, जोखिम विश्लेषण, स्वास्थ्य स्कोर र पोर्टफोलियो अप्टिमाइजर — नेपाली लगानीकर्ताका लागि सम्पूर्ण वित्तीय निर्णय इन्जिन।",
  keywords: [
    "सेवानिवृत्ति क्यालकुलेटर नेपाल",
    "बचत क्यालकुलेटर",
    "पेन्सन क्यालकुलेटर",
    "चक्रवृद्धि ब्याज नेपाल",
    "EPF क्यालकुलेटर",
    "SSF क्यालकुलेटर",
    "मासिक बचत योजना",
    "retirement calculator Nepal",
  ],
  openGraph: {
    title: "सेवानिवृत्ति क्यालकुलेटर | ZZC",
    description:
      "मासिक बचतले सेवानिवृत्तिमा कति कोष बन्छ — चक्रवृद्धि ब्याज सहित गणना गर्नुस्।",
    url: `${BASE_URL}/calculator`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "सेवानिवृत्ति क्यालकुलेटर",
  description:
    "Retirement savings calculator for Nepal — compound interest projection with monthly pension estimate.",
  url: `${BASE_URL}/calculator`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" },
  isPartOf: { "@type": "WebSite", url: BASE_URL, name: "ZZC — Zeneration Z Chautari" },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "गृहपृष्ठ", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "सेवानिवृत्ति क्यालकुलेटर",
        item: `${BASE_URL}/calculator`,
      },
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
      <CalculatorPage />
    </>
  );
}
