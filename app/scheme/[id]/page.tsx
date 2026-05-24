import type { Metadata } from "next";
import SchemeDetail from "./SchemeDetail";

const BASE_URL = "https://zzc.jeevanregmi.com.np";
const FIRESTORE =
  "https://firestore.googleapis.com/v1/projects/zeneration-z-chautari/databases/(default)/documents/structuredSchemes";

// dynamicParams = true so requests still work when SSG skips due to rate limits
export const dynamicParams = true;

// One fetch per build worker — no cache option (force-cache breaks webpack builds)
let schemesPromise: Promise<Map<string, Record<string, any>>> | null = null;

function getAllSchemeFields(): Promise<Map<string, Record<string, any>>> {
  if (!schemesPromise) {
    schemesPromise = fetch(`${FIRESTORE}?pageSize=200`)
      .then((r) => {
        if (!r.ok) {
          console.warn(`[scheme/page] Firestore returned ${r.status} — skipping SSG`);
          return { documents: [] };
        }
        return r.json();
      })
      .then((data) => {
        const map = new Map<string, Record<string, any>>();
        for (const doc of (data as { documents?: any[] }).documents ?? []) {
          const id: string = doc.name.split("/").pop();
          map.set(id, doc.fields ?? {});
        }
        return map;
      })
      .catch((err) => {
        console.warn(`[scheme/page] Firestore fetch failed — skipping SSG: ${err}`);
        return new Map<string, Record<string, any>>();
      });
  }
  return schemesPromise!;
}

function str(fields: Record<string, any>, key: string): string {
  return fields[key]?.stringValue ?? "";
}

export async function generateStaticParams() {
  const schemes = await getAllSchemeFields();
  return Array.from(schemes.keys()).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const schemes = await getAllSchemeFields();
  const f = schemes.get(id);

  if (!f) {
    return {
      title: "योजना विवरण",
      description: "ZZC — नेपालको लगानी योजनाहरूको विस्तृत जानकारी।",
    };
  }

  const title = str(f, "title");
  const org = str(f, "organization");
  const category = str(f, "category");
  const description =
    str(f, "nepaliSummary") || str(f, "summary") || `${title} — ${org} योजना`;

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
      type: "website",
    },
  };
}

export default async function SchemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Reuse cached data for JSON-LD — no extra fetch
  const schemes = await getAllSchemeFields();
  const f = schemes.get(id) ?? {};
  const title = str(f, "title");
  const org = str(f, "organization");
  const category = str(f, "category");
  const description = str(f, "nepaliSummary") || str(f, "summary");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: title || "Nepal Investment Scheme",
    description: description || undefined,
    url: `${BASE_URL}/scheme/${id}`,
    provider: {
      "@type": "Organization",
      name: org || "ZZC",
      url: BASE_URL,
    },
    category: category || undefined,
    brand: {
      "@type": "Brand",
      name: "ZZC — Zeneration Z Chautari",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SchemeDetail id={id} />
    </>
  );
}
