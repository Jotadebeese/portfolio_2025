import BlogFilters from "@/components/blogs/components/blog-filters";
import BlogsSection from "@/components/blogs/layout/blogs-section";
import { BlogsSkeleton } from "@/components/blogs/layout/blogs-section-skeleton";
import Hero from "@/components/common/hero";
import { getAllTags, getBlogPage } from "@/lib/payload/actions";
import { Media } from "@/payload-types";
import { Metadata } from "next";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

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

export default async function Blog(props: Props) {
  const searchParams = await props.searchParams;
  const tagsParam =
    typeof searchParams.tags === "string" ? searchParams.tags : undefined;
  const sort =
    typeof searchParams.sort === "string" ? searchParams.sort : "newest";

  const [blogPage, allTags] = await Promise.all([getBlogPage(), getAllTags()]);

  const image = blogPage.featuredImage as Media;

  const selectedTagNames = tagsParam ? tagsParam.split(",") : [];

  const activeTagIds =
    selectedTagNames.length > 0
      ? allTags
          .filter((t) => selectedTagNames.includes(t.name))
          .map((t) => t.id)
      : undefined;
  return (
    <>
      <Hero
        title={blogPage.title || ""}
        description={blogPage.shortDescription}
        image={image}
      />
      <BlogFilters tags={allTags} />
      <Suspense key={`${tagsParam}-${sort}`} fallback={<BlogsSkeleton />}>
        <BlogsSection tagIds={activeTagIds} sort={sort} />
      </Suspense>
    </>
  );
}
