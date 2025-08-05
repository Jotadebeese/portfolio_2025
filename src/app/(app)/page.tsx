import ProjectsSection from "@/components/projects/layouts/projects-section";
import { getHomePage } from "@/lib/payload/actions";
import { Media } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const homePage = await getHomePage();
  const metaImage = homePage.metaImage as Media;

  const title = homePage.metaTitle || "Start";
  const description =
    homePage.metaDescription ||
    "A Software Developer, with background in electronics engineering and a big passion in AI.";
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

export default async function Home() {
  const homePage = await getHomePage();

  return (
    <div className="w-full px-2.5 pt-20 sm:px-5">
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <RichText className="text-7xl md:text-[10rem]" data={homePage.title} />

        <div className="flex flex-col gap-5">
          <RichText className="text-xl md:text-2xl" data={homePage.subTitle} />

          <RichText className="text-base" data={homePage.shortDescription} />
        </div>
      </div>
      <ProjectsSection />
    </div>
  );
}
