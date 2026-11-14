import {
  Blog,
  Project,
  About,
  BlogPage,
  HomePage,
  BlogTag,
} from "@/payload-types";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

// Only cache data in production. In development, always fetch fresh data from Neon DB
const devAwareCache = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts?: string[],
  options?: { revalidate?: number | false; tags?: string[] },
): T => {
  if (process.env.NODE_ENV === "development") {
    return fn;
  }
  return unstable_cache(fn, keyParts, options);
};

export const getAllProjects = devAwareCache(
  async (): Promise<Project[]> => {
    const res = await payload.find({
      collection: "projects",
      where: {
        _status: { equals: "published" },
      },
      sort: ["_order", "-publishedAt"],
      depth: 1,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        stage: true,
        fullWidth: true,
        icon: true,
        video: true,
        shortDescription: true,
        projectType: true,
        links: true,
      },
    });
    return res.docs;
  },
  ["all-projects"],
  { tags: ["projects"] },
);

export const getProjectBySlug = devAwareCache(
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

export const getProjectSlugs = devAwareCache(
  async (): Promise<{ slug: string }[]> => {
    try {
      const projects = await payload.find({
        collection: "projects",
        where: {
          _status: { equals: "published" },
        },
        depth: 0,
        limit: 1000,
        select: { slug: true },
      });

      return projects.docs as { slug: string }[];
    } catch (error) {
      console.error("Error fetching project slugs:", error);
      return [];
    }
  },
  ["project-slugs"],
  { tags: ["projects"] },
);

export const getAllTags = devAwareCache(
  async (): Promise<BlogTag[]> => {
    const res = await payload.find({
      collection: "blogTags",
      sort: "name",
      limit: 100,
    });
    return res.docs;
  },
  ["all-blog-tags"],
  { tags: ["blog-tags"] },
);

export const getAllBlogs = devAwareCache(
  async (
    tagIds?: number[],
    sortOption: string = "newest",
  ): Promise<Partial<Blog>[]> => {
    const whereQuery: any = {
      _status: { equals: "published" },
      visibility: { not_equals: "private" },
    };

    if (tagIds && tagIds.length > 0) {
      whereQuery.blogTags = { in: tagIds };
    }

    let sortString = "-publishedAt";
    if (sortOption === "oldest") sortString = "publishedAt";
    if (sortOption === "title-asc") sortString = "title";
    if (sortOption === "title-desc") sortString = "-title";

    const res = await payload.find({
      collection: "blog",
      where: whereQuery,
      sort: sortString,
      depth: 1,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        shortDescription: true,
        blogTags: true,
      },
    });
    return res.docs;
  },
  ["filtered-blogs"],
  { tags: ["blogs"] },
);

export const getBlogSlugs = devAwareCache(
  async (): Promise<{ slug: string }[]> => {
    try {
      const blogs = await payload.find({
        collection: "blog",
        where: {
          _status: { equals: "published" },
          visibility: { not_equals: "private" },
        },
        depth: 0,
        limit: 1000,
        select: { slug: true },
      });
      return blogs.docs as { slug: string }[];
    } catch (error) {
      console.error("Error fetching blog slugs:", error);
      return [];
    }
  },
  ["blog-slugs"],
  { tags: ["blogs"] },
);

export const getBlogBySlug = devAwareCache(
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
        visibility: {
          not_equals: "private",
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

// Uncached lookup for token-gated private notes (never stored in shared ISR/Data Cache)
export async function getPrivateBlogBySlug(slug: string): Promise<Blog | null> {
  const res = await payload.find({
    collection: "blog",
    where: {
      slug: {
        equals: slug,
      },
      _status: {
        equals: "published",
      },
      visibility: {
        equals: "private",
      },
    },
    limit: 1,
    depth: 2,
  });
  return res.docs[0] || null;
}

// Globals
export const getAboutPage = devAwareCache(
  async (): Promise<About> => {
    const res = await payload.findGlobal({
      slug: "about",
      depth: 2,
    });
    return res;
  },
  ["about-page"],
  { tags: ["about-page"] },
);

export const getBlogPage = devAwareCache(
  async (): Promise<BlogPage> => {
    const res = await payload.findGlobal({
      slug: "blogPage",
      depth: 2,
    });
    return res;
  },
  ["blog-page"],
  { tags: ["blog-page"] },
);

export const getHomePage = devAwareCache(
  async (): Promise<HomePage> => {
    const res = await payload.findGlobal({
      slug: "homePage",
      depth: 2,
    });
    return res;
  },
  ["home-page"],
  { tags: ["home-page"] },
);
