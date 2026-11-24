import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getBlogSlugs, getProjectSlugs } from "@/lib/payload/actions";
import { getForthwebBaseUrl, isForthwebHost } from "@/lib/forthweb-host";
import { LIVE_TOOLS } from "@/components/tools/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") || "";

  if (host.startsWith("admin.")) {
    return [];
  }

  if (isForthwebHost(host)) {
    const forthwebBaseUrl = getForthwebBaseUrl(host);

    return [
      {
        url: forthwebBaseUrl,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 1.0,
      },
      ...LIVE_TOOLS.map((tool) => ({
        url: `${forthwebBaseUrl}/${tool.id}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.9,
      })),
    ];
  }

  const baseUrl = process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  const [blogSlugs, projectSlugs] = await Promise.all([
    getBlogSlugs(),
    getProjectSlugs(),
  ]);

  const blogs = blogSlugs.map((post) => ({
    url: `${baseUrl}/notes/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const projects = projectSlugs.map((project) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const staticRoutes = ["", "/notes"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  return [...staticRoutes, ...projects, ...blogs];
}
