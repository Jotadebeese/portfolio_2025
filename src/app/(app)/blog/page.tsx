import BlogsSection from "@/components/blogs/layout/blogs-section";
import Hero from "@/components/common/hero";
import { getBlogPage } from "@/lib/payload/actions";

export default async function Blog() {
  const blogPage = await getBlogPage();

  const image = blogPage.featuredImage as { url: string; alt: string };
  return (
    <>
      <Hero
        title={blogPage.title}
        description={blogPage.shortDescription}
        image={image}
      />
      <BlogsSection />
    </>
  );
}
