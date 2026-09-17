import { getAllBlogs, getAllProjects } from "@/lib/payload/actions";

export const revalidate = 3600;

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

  const projectItems = projects
    .map((proj) => {
      const url = proj.individualPage
        ? `${baseUrl}/projects/${proj.slug}`
        : proj.liveUrl || proj.githubUrl || `${baseUrl}/#projects`;
      const desc = proj.metaDescription ? `: ${proj.metaDescription}` : "";
      return `- [${proj.title}](${url})${desc}`;
    })
    .join("\n");

  const content = `# Juan Bedoya

> Full Stack Product Engineer with a background in electronics engineering and a passion for AI. Building modern web applications, scalable platforms, and AI-native products.

## About
- [About Me](${baseUrl}/about): Professional background, electronics engineering roots, and technical philosophy.

## Notes & Articles
${blogItems || "- No articles published yet."}

## Projects & Products
${projectItems || "- No public projects published yet."}

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
