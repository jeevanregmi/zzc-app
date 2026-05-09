import type { Metadata } from "next";
import CalculatorPage from "./CalculatorClient";

export const metadata: Metadata = {
  title: "सेवानिवृत्ति क्यालकुलेटर",
  description:
    "मासिक बचत र ब्याज दरको आधारमा सेवानिवृत्तिमा हुने कोष गणना गर्नुस् — चक्रवृद्धि ब्याज, कुल योगदान र अनुमानित मासिक पेन्सन सहित।",
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
    url: "https://zzc.jeevanregmi.com.np/calculator",
  },
};

export default function Page() {
  return <CalculatorPage />;
}
