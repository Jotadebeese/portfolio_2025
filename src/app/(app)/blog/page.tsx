import Image from "next/image";
import bowser from "@/assets/error.png";
import BlogsSection from "@/components/blogs/layout/blogs-section";
import BlogHero from "@/components/blogs/components/blog-hero";

const image = {
  url: bowser.src,
  alt: "Bowser",
};

export default function Blog() {
  return (
    <>
      <BlogHero
        title="Blogs"
        description="Here are some writes about thenology, personal topics and anything that catch my attention."
        image={image}
      />
      <BlogsSection />
    </>
  );
}
