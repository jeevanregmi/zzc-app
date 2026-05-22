import type { Metadata } from "next";
import JantaClient from "./JantaClient";

export const metadata: Metadata = {
  title: "जनता Intelligence — ZZC Nepal",
  description: "नेपाल सरकारका नीति, बजेट र वित्तीय निर्णयहरू — AI विश्लेषण सहित। युवाहरूका लागि सरल भाषामा।",
  openGraph: {
    title: "जनता Intelligence — ZZC Nepal",
    description: "Nepal सरकारका नीतिहरू AI ले analyze गरेर सरल नेपालीमा — ZZC Janta",
  },
};

export default function JantaPage() {
  return <JantaClient />;
}
