import type { Metadata } from "next";
import EligibilityPage from "./EligibilityClient";

const BASE_URL = "https://zzc.jeevanregmi.com.np";

export const metadata: Metadata = {
  title: "योग्यता जाँच",
  description:
    "आफ्नो रोजगारी प्रकार र उमेरको आधारमा EPF, CIT र SSF को लागि योग्यता जाँच गर्नुस् — तुरुन्तै परिणाम पाउनुस्।",
  keywords: [
    "EPF योग्यता",
    "CIT योग्यता",
    "SSF योग्यता",
    "सामाजिक सुरक्षा नेपाल",
    "कर्मचारी सञ्चय कोष योग्यता",
    "नागरिक लगानी कोष",
    "सामाजिक सुरक्षा कोष दर्ता",
    "नेपाल रोजगारी सुविधा",
  ],
  openGraph: {
    title: "योग्यता जाँच | ZZC",
    description:
      "आफ्नो रोजगारी प्रकार र उमेरको आधारमा EPF, CIT र SSF को लागि योग्यता जाँच गर्नुस्।",
    url: `${BASE_URL}/eligibility`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "योग्यता जाँच — EPF, CIT, SSF",
  description:
    "Check your eligibility for EPF, CIT, and SSF schemes based on employment type and age.",
  url: `${BASE_URL}/eligibility`,
  isPartOf: { "@type": "WebSite", url: BASE_URL, name: "ZZC — Zeneration Z Chautari" },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "गृहपृष्ठ", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "योग्यता जाँच", item: `${BASE_URL}/eligibility` },
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
      <EligibilityPage />
    </>
  );
}
