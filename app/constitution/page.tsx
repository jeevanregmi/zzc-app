import type { Metadata } from "next";
import ConstitutionReaderClient from "./ConstitutionReaderClient";

export const metadata: Metadata = {
  title: "नेपालको संविधान — ZZC",
  description: "धारा, भाग र अधिकारहरू सजिलो भाषामा पढ्नुहोस्। मौलिक हक, नागरिकता, CIAA, NHRC — meaning-based search with civic knowledge cards.",
  openGraph: {
    title: "नेपालको संविधान — ZZC",
    description: "धारा, भाग र अधिकारहरू सजिलो भाषामा पढ्नुहोस्। मौलिक हक, नागरिकता, CIAA, NHRC।",
  },
};

export default function ConstitutionPage() {
  return <ConstitutionReaderClient />;
}
