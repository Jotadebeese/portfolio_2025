import { Blog, Project } from "@/payload-types";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

export const getAllProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const res = await payload.find({
      collection: "projects",
      where: {
        _status: { equals: "published" },
      },
      sort: "-publishedAt",
      depth: 2,
    });
    return res.docs;
  },
  ["all-projects"],
  { tags: ["projects"] },
);

export const getProjectBySlug = unstable_cache(
  async (slug: string): Promise<Project | null> => {
    const res = await payload.find({
      collection: "projects",
      where: {
        slug: {
          equals: slug,
        },
        _status: {
          equals: "published",
        },
      },
      limit: 1,
      depth: 2,
    });
    return res.docs[0] || null;
  },
  ["project-by-slug"],
  { tags: ["projects"] },
);

export const getAllBlogs = unstable_cache(
  async (): Promise<Blog[]> => {
    const res = await payload.find({
      collection: "blog",
      where: {
        _status: { equals: "published" },
      },
      sort: "-publishedAt",
      depth: 2,
    });
    return res.docs;
  },
  ["all-blogs"],
  { tags: ["blogs"] },
);

export const getBlogBySlug = unstable_cache(
  async (slug: string): Promise<Blog | null> => {
    const res = await payload.find({
      collection: "blog",
      where: {
        slug: {
          equals: slug,
        },
        _status: {
          equals: "published",
        },
      },
      limit: 1,
      depth: 2,
    });
    return res.docs[0] || null;
  },
  ["blog-by-slug"],
  { tags: ["blogs"] },
);
