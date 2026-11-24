import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getForthwebBaseUrl, isForthwebHost } from "@/lib/forthweb-host";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host") || "";

  if (host.startsWith("admin.")) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  if (isForthwebHost(host)) {
    const forthwebBaseUrl = getForthwebBaseUrl(host);
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/forthweb/"],
      },
      sitemap: `${forthwebBaseUrl}/sitemap.xml`,
      host: forthwebBaseUrl,
    };
  }

  const baseUrl = process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/forthweb/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
