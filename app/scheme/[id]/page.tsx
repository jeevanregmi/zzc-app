import type { Metadata } from "next";
import SchemeDetail from "./SchemeDetail";

const BASE_URL = "https://zzc.jeevanregmi.com.np";
const FIRESTORE =
  "https://firestore.googleapis.com/v1/projects/zeneration-z-chautari/databases/(default)/documents/structuredSchemes";

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const res = await fetch(`${FIRESTORE}?pageSize=200`, { cache: "no-store" });
    const data = await res.json();
    const documents: any[] = data.documents ?? [];
    return documents.map((d) => ({ id: d.name.split("/").pop() as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${FIRESTORE}/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    const f = data.fields ?? {};
    const str = (key: string) => f[key]?.stringValue ?? "";
    const title = str("title");
    const org = str("organization");
    const category = str("category");
    const description = str("nepaliSummary") || str("summary") || `${title} — ${org} योजना विवरण`;
    return {
      title,
      description,
      keywords: [
        title,
        org,
        category,
        "नेपाल लगानी",
        "बचत योजना",
        "EPF",
        "CIT",
        "SSF",
        "सेवानिवृत्ति",
      ],
      openGraph: {
        title: `${title} | ZZC`,
        description,
        url: `${BASE_URL}/scheme/${id}`,
      },
    };
  } catch {
    return {
      title: "योजना विवरण",
      description: "ZZC — नेपालको लगानी योजनाहरूको विस्तृत जानकारी।",
    };
  }
}

export default async function SchemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SchemeDetail id={id} />;
}
