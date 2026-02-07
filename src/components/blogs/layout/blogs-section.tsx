import BlogCard from "../components/blog-card";
import { getAllBlogs } from "@/lib/payload/actions";

export default async function BlogsSection({
  tagIds,
  sort,
}: {
  tagIds?: number[];
  sort?: string;
}) {
  const blogs = await getAllBlogs(tagIds, sort);
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 p-2.5 sm:px-0">
        {blogs.length === 0 ? (
          <div className="flex w-full py-5">
            <p className="font-light">Work in progress, nothing to see here.</p>
          </div>
        ) : (
          blogs.map((blog) => <BlogCard key={blog.id} {...blog} />)
        )}
      </div>
    </div>
  );
}
