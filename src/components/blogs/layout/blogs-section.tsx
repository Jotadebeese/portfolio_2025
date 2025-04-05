import BlogCard from "../components/blog-card";
import { getAllBlogs } from "@/lib/payload/actions";

export default async function BlogsSection() {
  const blogs = await getAllBlogs();
  return (
    <div className="flex flex-col gap-5 p-2.5 sm:px-5">
      {blogs.length === 0 ? (
        <div className="border-border-color flex w-full border-b border-dashed py-5">
          <p className="font-light">Work in progress, nothing to see here.</p>
        </div>
      ) : (
        blogs.map((blog) => <BlogCard key={blog.id} {...blog} />)
      )}
    </div>
  );
}
