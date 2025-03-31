import { getPayload } from "payload";
import config from "@payload-config";
import BlogCard from "../components/blog-card";

export default async function BlogsSection() {
  const payload = await getPayload({ config });

  const blogsData = await payload.find({
    collection: "blog",
    where: {
      _status: { equals: "published" },
    },
    sort: "-publishedAt",
    depth: 2,
  });
  const blogs = blogsData.docs;

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
