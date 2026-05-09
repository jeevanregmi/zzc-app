import type { Metadata } from "next";
import HomeClient from "./HomeClient";

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
    url: "https://zzc.jeevanregmi.com.np",
  },
};

export default function Page() {
  return <HomeClient />;
}
