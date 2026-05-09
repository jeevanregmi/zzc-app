import type { Metadata } from "next";
import EligibilityPage from "./EligibilityClient";

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
    url: "https://zzc.jeevanregmi.com.np/eligibility",
  },
};

export default function Page() {
  return <EligibilityPage />;
}
