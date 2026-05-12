import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/vault"],
      },
    ],
    sitemap: "https://zzc.jeevanregmi.com.np/sitemap.xml",
  };
}
