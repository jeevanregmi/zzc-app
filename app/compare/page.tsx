import type { Metadata } from "next";
import ComparePage from "./CompareClient";

const BASE_URL = "https://zzc.jeevanregmi.com.np";

export const metadata: Metadata = {
  title: "स्मार्ट तुलना",
  description:
    "EPF, CIT र SSF योजनाहरू एकसाथ तुलना गर्नुस् — ब्याज दर, जोखिम स्तर, तरलता, बीमा, पेन्सन र अन्य फाइदाहरू।",
  keywords: [
    "EPF CIT SSF तुलना",
    "नेपाल लगानी तुलना",
    "बचत योजना तुलना",
    "सेवानिवृत्ति योजना तुलना",
    "ब्याज दर तुलना नेपाल",
    "कर्मचारी सञ्चय कोष",
    "नागरिक लगानी कोष",
    "सामाजिक सुरक्षा कोष",
  ],
  openGraph: {
    title: "स्मार्ट तुलना | ZZC",
    description:
      "EPF, CIT र SSF योजनाहरू एकसाथ तुलना — ब्याज दर, जोखिम, तरलता र फाइदाहरू।",
    url: `${BASE_URL}/compare`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "स्मार्ट तुलना — EPF, CIT, SSF",
  description:
    "Side-by-side comparison of Nepal's EPF, CIT, and SSF investment schemes — interest rates, risk, liquidity, and benefits.",
  url: `${BASE_URL}/compare`,
  isPartOf: { "@type": "WebSite", url: BASE_URL, name: "ZZC — Zeneration Z Chautari" },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "गृहपृष्ठ", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "स्मार्ट तुलना", item: `${BASE_URL}/compare` },
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
      <ComparePage />
    </>
  );
}
