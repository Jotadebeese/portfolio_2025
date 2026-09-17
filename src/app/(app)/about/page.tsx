import BlockContent from "@/components/common/block-content";
import Hero from "@/components/common/hero";
import { getAboutPage } from "@/lib/payload/actions";
import { extractTextFromRichText } from "@/lib/payload/utils/extract-text";
import { Media } from "@/payload-types";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const aboutPage = await getAboutPage();
  const metaImage = aboutPage.metaImage as Media;
  const featuredImage = aboutPage.featuredImage as Media;

  const title = aboutPage.metaTitle || "About";
  const fallbackDescription =
    extractTextFromRichText(aboutPage.shortDescription) ||
    "Just a bit about my background.";
  const description = aboutPage.metaDescription || fallbackDescription;
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

export default async function About() {
  const aboutPage = await getAboutPage();
  const featuredImage = aboutPage.featuredImage as Media;
  const baseUrl = process.env.NEXT_WEB_APP_PUBLIC_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        dateCreated: aboutPage.createdAt,
        dateModified: aboutPage.updatedAt,
        mainEntity: {
          "@type": "Person",
          name: "Juan Bedoya",
          url: baseUrl,
          jobTitle: [
            "Full Stack Product Engineer",
            "Product Engineer",
            "Software Developer",
          ],
          description:
            aboutPage.metaDescription ||
            "Full Stack Product Engineer with a background in electronics engineering and a passion for AI.",
          image: featuredImage?.url || undefined,
          sameAs: [
            "https://github.com/Jotadebeese",
            "https://www.linkedin.com/in/jotadebeese/",
          ],
        },
      },
      {
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
            name: "About",
            item: `${baseUrl}/about`,
          },
        ],
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
        title={aboutPage.title || ""}
        description={aboutPage.shortDescription}
        image={featuredImage}
        goBack={false}
      />
      <BlockContent data={aboutPage.content} />
    </>
  );
}
