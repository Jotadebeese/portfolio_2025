import { Blog } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function BlogCard(blog: Blog) {
  const publishedAt = new Date(blog.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div
      className="border-border-color flex w-full flex-col gap-2 border-b border-dashed py-5"
      key={blog.id}
    >
      <div className="flex flex-col">
        <Link
          href={`/blog/${blog.slug}`}
          className="group flex items-center gap-1 transition-all ease-in-out hover:text-amber-600"
        >
          <h3>{blog.title}</h3>
          <ChevronRight
            size={16}
            className="text-foreground transition-all ease-in-out"
          />
        </Link>
        <small className="font-medium">{publishedAt}</small>
      </div>
      <RichText
        data={blog.shortDescription}
        className="max-w-lg text-sm font-light"
      />
    </div>
  );
}
