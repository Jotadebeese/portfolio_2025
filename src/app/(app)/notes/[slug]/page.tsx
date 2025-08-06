import { getBlogBySlug } from "@/lib/payload/actions";
import { notFound } from "next/navigation";
import Hero from "@/components/common/hero";
import BlockContent from "@/components/common/block-content";
import { Metadata } from "next";
import { Media } from "@/payload-types";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = await getBlogBySlug(slug);

  if (!note) {
    notFound();
  }

  const metaImage = note.metaImage as Media;

  const title = note.metaTitle || note.title;
  const description = note.metaDescription || "Read this note on my portfolio.";
  const imageUrl = metaImage?.url || "/assets/bowser.jpeg";

  return {
    title,
    description,
    alternates: {
      canonical: `/notes/${slug}`,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: metaImage?.alt || "Lego set of Bowser from Mario.",
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BlogsPage({ params }: Props) {
  const { slug } = await params;

  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return notFound();
  }

  const image = blog.featuredImage as Media;

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
