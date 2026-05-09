import type { Metadata } from "next";
import ComparePage from "./CompareClient";

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
    url: "https://zzc.jeevanregmi.com.np/compare",
  },
};

export default function Page() {
  return <ComparePage />;
}
