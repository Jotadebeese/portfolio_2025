import BlogsContainer from "@/components/blogs/components/blogs-container";
import Hero from "@/components/common/hero";
import { getAllBlogs, getAllTags, getBlogPage } from "@/lib/payload/actions";
import { Media } from "@/payload-types";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const heroPage = await getBlogPage();
  const metaImage = heroPage.metaImage as Media;

  const title = heroPage.metaTitle || "Notes";
  const description =
    heroPage.metaDescription ||
    "Here are some writings about technology, personal topics and anything that catches my attention.";
  const imageUrl = metaImage?.url || "/assets/bowser.jpeg";

  return {
    title,
    description,
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

export default async function Blog() {
  const [blogPage, allTags, allBlogs] = await Promise.all([
    getBlogPage(),
    getAllTags(),
    getAllBlogs(),
  ]);

  const image = blogPage.featuredImage as Media;

  return (
    <>
      <Hero
        title={blogPage.title || ""}
        description={blogPage.shortDescription}
        image={image}
      />
      <Suspense fallback={null}>
        <BlogsContainer blogs={allBlogs} tags={allTags} />
      </Suspense>
    </>
  );
}
