import { getPayload } from "payload";
import config from "@payload-config";
import BlogHero from "@/components/blogs/components/blog-hero";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { Media } from "@/payload-types";
import Image from "next/image";

export default async function BlogsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const blogData = await payload.find({
    collection: "blog",
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    depth: 2,
  });
  const blog = blogData.docs[0];
  const image = blog.featuredImage as { url: string; alt: string };
  console.log(blog.content);
  return (
    <>
      <BlogHero
        title={blog.title}
        description={blog.shortDescription}
        image={image}
        goBack={true}
      />
      <div className="px-2.5 sm:px-0">
        <div className="border-border-color mt-5 flex w-full items-center justify-center border-y border-dashed py-8">
          <div className="flex max-w-3xl flex-col gap-5">
            {blog.content.map((block, index) => {
              if (block.blockType === "text") {
                return (
                  <div key={index}>
                    <RichText data={block.text} className="RichText" />
                  </div>
                );
              }
              if (block.blockType === "image") {
                const image = block.image as Media;
                return (
                  image.url && (
                    <div className="flex flex-col" key={index}>
                      <div className="relative h-80 overflow-hidden rounded-lg shadow-sm">
                        <Image
                          src={image.url}
                          alt={image.alt}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {block.caption && (
                        <small className="italic">{block.caption}</small>
                      )}
                    </div>
                  )
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </>
  );
}
