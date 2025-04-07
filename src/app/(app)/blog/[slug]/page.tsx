import { RichText } from "@payloadcms/richtext-lexical/react";
import { Media } from "@/payload-types";
import Image from "next/image";
import { getBlogBySlug } from "@/lib/payload/actions";
import { notFound } from "next/navigation";
import Hero from "@/components/common/hero";
import BlockContent from "@/components/common/block-content";

export default async function BlogsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return notFound();
  }

  const image = blog.featuredImage as { url: string; alt: string };

  return (
    <>
      <Hero
        title={blog.title}
        description={blog.shortDescription}
        image={image}
        goBack={true}
      />
      <BlockContent data={blog.content} />
    </>
  );
}
