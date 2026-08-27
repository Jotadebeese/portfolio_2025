"use client";

import { Blog, BlogTag } from "@/payload-types";
import { useSearchParams } from "next/navigation";
import BlogFilters from "./blog-filters";
import BlogCard from "./blog-card";
import { useMemo } from "react";

export default function BlogsContainer({
  blogs,
  tags,
}: {
  blogs: Partial<Blog>[];
  tags: BlogTag[];
}) {
  const searchParams = useSearchParams();
  const tagsParam = searchParams.get("tags");
  const sort = searchParams.get("sort") || "newest";

  const filteredBlogs = useMemo(() => {
    let result = [...blogs];

    if (tagsParam) {
      const selectedTagNames = tagsParam.split(",");
      result = result.filter((blog) => {
        const blogTags = (
          Array.isArray(blog.blogTags) ? blog.blogTags : []
        ) as BlogTag[];
        return blogTags.some((t) => selectedTagNames.includes(t.name));
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0).getTime();
      const dateB = new Date(b.publishedAt || 0).getTime();

      if (sort === "oldest") return dateA - dateB;
      if (sort === "title-asc")
        return (a.title || "").localeCompare(b.title || "");
      if (sort === "title-desc")
        return (b.title || "").localeCompare(a.title || "");

      // Default: newest first
      return dateB - dateA;
    });

    return result;
  }, [blogs, tagsParam, sort]);

  return (
    <>
      <BlogFilters tags={tags} />
      <div className="flex flex-col">
        <div className="flex flex-col gap-5 p-2.5 sm:px-0 pb-8">
          {filteredBlogs.length === 0 ? (
            <div className="flex w-full py-5">
              <p className="font-light">Work in progress, nothing to see here.</p>
            </div>
          ) : (
            filteredBlogs.map((blog) => <BlogCard key={blog.id} {...blog} />)
          )}
        </div>
      </div>
    </>
  );
}
