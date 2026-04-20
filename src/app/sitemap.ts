import { MetadataRoute } from "next";
import { getBlogSlugs, getProjectSlugs } from "@/lib/payload/actions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const staticRoutes = ["", "/about", "/projects", "/notes"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  return [...staticRoutes, ...projects, ...blogs];
}
