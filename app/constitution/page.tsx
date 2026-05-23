import type { Metadata } from "next";
import ConstitutionTreeClient from "./ConstitutionTreeClient";

export const metadata: Metadata = {
  title: "संविधान Tree — ZZC Nepal",
  description: "नेपालको संविधान एउटा जीवित रूख — मौलिक हक, निर्देशक सिद्धान्त, संस्था, र नागरिक अधिकार। Topic खोज्नुस् — constitutional root देखाउँछ।",
  openGraph: {
    title: "Nepal Constitution Tree — ZZC",
    description: "Constitutional governance intelligence — search any topic, see the root article, related policies, budgets, and implementation status.",
  },
};

export default function ConstitutionPage() {
  return <ConstitutionTreeClient />;
}
