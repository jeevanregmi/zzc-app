import type { Metadata } from "next";
import FinanceClient from "./FinanceClient";

export const metadata: Metadata = {
  title: "Finance Intelligence — ZZC Nepal",
  description: "NRB, EPF, SSF, CIT, बैंक, बीमा — नेपालका financial records AI ले structured intelligence मा। नागरिकले सोध्न सक्छन्: 'EPF बाट के फाइदा हुन्छ?' — जवाफ real documents बाट।",
  openGraph: {
    title: "Finance Intelligence — ZZC Nepal",
    description: "Nepal को financial intelligence graph — NRB directives, EPF rules, loan limits, NEPSE rules — AI ले structured, traceable, queryable।",
  },
};

export default function FinancePage() {
  return <FinanceClient />;
}
