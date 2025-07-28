import BlockContent from "@/components/common/block-content";
import Hero from "@/components/common/hero";
import { getAboutPage } from "@/lib/payload/actions";

export default async function About() {
  const aboutPage = await getAboutPage();
  const featuredImage = aboutPage.featuredImage as { url: string; alt: string };
  return (
    <>
      <Hero
        title={aboutPage.title || ""}
        description={aboutPage.shortDescription}
        image={featuredImage}
        goBack={false}
      />
      <BlockContent data={aboutPage.content} />
    </>
  );
}
