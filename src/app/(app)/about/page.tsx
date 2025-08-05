import BlockContent from "@/components/common/block-content";
import Hero from "@/components/common/hero";
import { getAboutPage } from "@/lib/payload/actions";
import { Media } from "@/payload-types";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const aboutPage = await getAboutPage();
  const metaImage = aboutPage.metaImage as Media;

  const title = aboutPage.metaTitle || "About";
  const description =
    aboutPage.metaDescription || "Just a bit about my background.";
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
          alt: metaImage.alt || "Lego set of Bowser from Mario.",
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
