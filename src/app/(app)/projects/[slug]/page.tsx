import BlockContent from "@/components/common/block-content";
import { getProjectBySlug } from "@/lib/payload/actions";
import { Media } from "@/payload-types";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    notFound();
  }
  const metaImage = project.metaImage as Media;

  const title = project.metaTitle || project.title;
  const description =
    project.metaDescription ||
    "One of my side projects where i explore ideas and concepts.";
  const imageUrl = metaImage?.url || "/assets/bowser.jpeg";

  return {
    title,
    description,
    alternates: {
      canonical: `/projects/${slug}`,
    },
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

export default async function ProjectsPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return notFound();
  }

  return <BlockContent data={project.content} />;
}
