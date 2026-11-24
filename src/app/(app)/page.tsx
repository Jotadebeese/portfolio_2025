import CTAButton from "@/components/common/cta-button";
import ProjectsSection from "@/components/projects/layouts/projects-section";
import { ProjectsSkeleton } from "@/components/projects/layouts/projects-section-skeleton";
import { getHomePage } from "@/lib/payload/actions";
import { extractTextFromRichText } from "@/lib/payload/utils/extract-text";
import { Media } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ArrowDown } from "lucide-react";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const homePage = await getHomePage();
  const metaImage = homePage.metaImage as Media;

  const title = homePage.metaTitle || "Start";
  const fallbackDescription =
    extractTextFromRichText(homePage.shortDescription) ||
    "Full Stack Product Engineer with a background in electronics engineering and a passion for AI.";
  const description = homePage.metaDescription || fallbackDescription;
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
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Home() {
  const homePage = await getHomePage();
  const baseUrl =
    process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Juan Bedoya",
        alternateName: ["Jotadebeese"],
        url: baseUrl,
      },
      {
        "@type": "Person",
        name: "Juan Bedoya",
        url: baseUrl,
        jobTitle: [
          "Full Stack Product Engineer",
          "Product Engineer",
          "Software Developer",
        ],
        sameAs: [
          "https://github.com/Jotadebeese",
          "https://www.linkedin.com/in/jotadebeese/",
        ],
      },
    ],
  };

  return (
    <div className="w-full px-2.5 pt-8 sm:px-5 sm:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <RichText className="text-7xl md:text-[10rem]" data={homePage.title} />

        <div id="about" className="flex scroll-mt-10 flex-col gap-5">
          <RichText className="text-xl md:text-2xl" data={homePage.subTitle} />

          <RichText className="text-base" data={homePage.shortDescription} />

          <div className="flex flex-wrap items-center justify-start gap-3 pt-2">
            <CTAButton href="#projects" variant="primary">
              <span>Projects &amp; Products</span>
              <ArrowDown
                size={14}
                aria-hidden="true"
                className="text-background/80 group-hover:text-background transition-transform duration-150 ease-out group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </CTAButton>

            <CTAButton href="#client-work" variant="secondary">
              <span>Client Work</span>
              <ArrowDown
                size={14}
                aria-hidden="true"
                className="text-foreground/70 group-hover:text-foreground transition-transform duration-150 ease-out group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </CTAButton>
          </div>
        </div>
      </div>
      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectsSection />
      </Suspense>
    </div>
  );
}
