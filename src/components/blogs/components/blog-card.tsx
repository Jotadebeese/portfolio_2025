import { Blog, BlogTag } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ChevronRight, CircleDotDashed } from "lucide-react";
import Link from "next/link";

export default function BlogCard(blog: Partial<Blog>) {
  const publishedAt = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const blogTags = (
    Array.isArray(blog.blogTags) ? blog.blogTags : []
  ) as BlogTag[];
  return (
    <div
      className="border-border-color flex w-full flex-col gap-2 border-b border-dashed py-5"
      key={blog.id}
    >
      <div className="flex flex-col">
        <Link
          href={`/notes/${blog.slug}`}
          className="group flex items-center gap-1 transition-all ease-in-out hover:text-amber-600"
        >
          <h3 className="text-lg">{blog.title}</h3>
          <ChevronRight
            size={16}
            className="text-foreground transition-all ease-in-out"
          />
        </Link>
        <small className="font-medium">{publishedAt}</small>
      </div>

      {blog.shortDescription && (
        <RichText
          data={blog.shortDescription}
          className="max-w-lg text-sm font-light"
        />
      )}

      {blogTags && blogTags.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2">
          {blogTags.map((tag) => (
            <li
              key={tag.id}
              style={{ ["--tag-color" as any]: tag.color || "#666" }}
              className="flex w-fit items-center gap-1 rounded-md bg-[var(--tag-color)]/10 px-1.5 text-[var(--tag-color)]"
            >
              <CircleDotDashed size={12} />
              <small>{tag.name}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
