import BlogsContainer from "@/components/blogs/components/blogs-container";
import Hero from "@/components/common/hero";
import { getAllBlogs, getAllTags, getBlogPage } from "@/lib/payload/actions";
import { extractTextFromRichText } from "@/lib/payload/utils/extract-text";
import { Media } from "@/payload-types";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const heroPage = await getBlogPage();
  const metaImage = heroPage.metaImage as Media;
  const featuredImage = heroPage.featuredImage as Media;

  const title = heroPage.metaTitle || "Notes";
  const fallbackDescription =
    extractTextFromRichText(heroPage.shortDescription) ||
    "Here are some writings about technology, personal topics and anything that catches my attention.";
  const description = heroPage.metaDescription || fallbackDescription;
  const imageUrl =
    metaImage?.url || featuredImage?.url || "/assets/bowser.jpeg";
  const imageAlt =
    metaImage?.alt ||
    featuredImage?.alt ||
    "Lego set of Bowser from Mario.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
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
  const baseUrl = process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Notes",
        item: `${baseUrl}/notes`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
