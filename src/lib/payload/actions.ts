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

export const getAllProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const res = await payload.find({
      collection: "projects",
      where: {
        _status: { equals: "published" },
      },
      sort: "-publishedAt",
      depth: 1,
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
        stage: true,
        icon: true,
        shortDescription: true,
        projectType: true,
        liveUrl: true,
        githubUrl: true,
        individualPage: true,
      },
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

export async function getProjectSlugs(): Promise<{ slug: string }[]> {
  try {
    const projects = await payload.find({
      collection: "projects",
      depth: 0,
      limit: 1000,
      select: { slug: true },
    });

    return projects.docs as { slug: string }[];
  } catch (error) {
    console.error("Error fetching project slugs:", error);
    return [];
  }
}

export const getAllTags = unstable_cache(
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

export const getAllBlogs = unstable_cache(
  async (
    tagIds?: number[],
    sortOption: string = "newest",
  ): Promise<Partial<Blog>[]> => {
    const whereQuery: any = {
      _status: { equals: "published" },
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
      sort: sortOption,
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

export async function getBlogSlugs(): Promise<{ slug: string }[]> {
  try {
    const blogs = await payload.find({
      collection: "blog",
      depth: 0,
      limit: 1000,
      select: { slug: true },
    });
    return blogs.docs as { slug: string }[];
  } catch (error) {
    console.error("Error fetching blog slugs:", error);
    return [];
  }
}

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

// Globals
export const getAboutPage = unstable_cache(
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

export const getBlogPage = unstable_cache(
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

export const getHomePage = unstable_cache(
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
