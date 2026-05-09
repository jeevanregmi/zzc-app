import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://zzc.jeevanregmi.com.np";
const FIRESTORE =
  "https://firestore.googleapis.com/v1/projects/zeneration-z-chautari/databases/(default)/documents/structuredSchemes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/eligibility`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  try {
    const res = await fetch(`${FIRESTORE}?pageSize=200`, { cache: "force-cache" });
    const data = await res.json();
    const documents: any[] = data.documents ?? [];
    const schemePages: MetadataRoute.Sitemap = documents.map((d) => ({
      url: `${BASE_URL}/scheme/${d.name.split("/").pop()}`,
      lastModified: d.updateTime ? new Date(d.updateTime) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }));
    return [...staticPages, ...schemePages];
  } catch {
    return staticPages;
  }
}
