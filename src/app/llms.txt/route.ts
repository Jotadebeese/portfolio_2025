import { getAllBlogs, getAllProjects } from "@/lib/payload/actions";
import { Project } from "@/payload-types";

export const revalidate = 3600;

function formatProjectItem(
  proj: Project,
  baseUrl: string,
  fallbackAnchor: string,
): string {
  const cardLinks = Array.isArray(proj.links) ? proj.links : [];
  const primaryCardLink = cardLinks.find(
    (link) => link.isCardLink && link.url?.trim(),
  );
  const internalLink = cardLinks.find(
    (link) => link.linkType === "internal" && link.url?.trim(),
  );
  const preferredLink =
    primaryCardLink ||
    internalLink ||
    cardLinks.find((link) => link.url?.trim());
  const rawUrl = preferredLink?.url?.trim();
  const url = rawUrl
    ? rawUrl.startsWith("/")
      ? `${baseUrl}${rawUrl}`
      : rawUrl
    : `${baseUrl}/${fallbackAnchor}`;
  const desc = proj.metaDescription ? `: ${proj.metaDescription}` : "";
  return `- [${proj.title}](${url})${desc}`;
}

export async function GET() {
  const baseUrl = process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  const [blogs, projects] = await Promise.all([
    getAllBlogs().catch(() => []),
    getAllProjects().catch(() => []),
  ]);

  const blogItems = blogs
    .map((blog) => {
      const desc = blog.metaDescription ? `: ${blog.metaDescription}` : "";
      return `- [${blog.title}](${baseUrl}/notes/${blog.slug})${desc}`;
    })
    .join("\n");

  const productItems = projects
    .filter((proj) => proj.category !== "client")
    .map((proj) => formatProjectItem(proj, baseUrl, "#projects"))
    .join("\n");

  const clientItems = projects
    .filter((proj) => proj.category === "client")
    .map((proj) => formatProjectItem(proj, baseUrl, "#client-work"))
    .join("\n");

  const clientSection = clientItems
    ? `\n## Client Work\n${clientItems}\n`
    : "";

  const content = `# Juan Bedoya

> Full Stack Product Engineer with a background in electronics engineering and a passion for AI. Building modern web applications, scalable platforms, and AI-native products.

## About
- [About Me](${baseUrl}/about): Professional background, electronics engineering roots, and technical philosophy.

## Notes & Articles
${blogItems || "- No articles published yet."}

## Projects & Products
${productItems || "- No public projects published yet."}
${clientSection}
## Links & Socials
- [GitHub](https://github.com/Jotadebeese): Open source projects, experiments, and code repositories.
- [LinkedIn](https://www.linkedin.com/in/jotadebeese/): Work experience, career history, and professional connections.
- [Portfolio Home](${baseUrl}): Interactive portfolio, featured work, and contact drawer.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
