import TableOfContents from "@/components/blogs/components/table-of-contents";
import BlockContent from "@/components/common/block-content";
import { getProjectBySlug, getProjectSlugs } from "@/lib/payload/actions";
import { extractHeadingsFromBlocks } from "@/lib/payload/utils/extract-headings";
import { Media } from "@/payload-types";
import clsx from "clsx";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const projects = await getProjectSlugs();
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

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

export default async function ProjectsPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return notFound();
  }

  const headings = extractHeadingsFromBlocks(project.content);
  const publishedAt = project.publishedAt
    ? new Date(project.publishedAt)
    : new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(publishedAt);

  return (
    <>
      <div className="flex flex-col gap-0 px-2.5 pt-10 sm:px-0">
        <h2>{project.title}</h2>
        <small className="w-full">{formattedDate}</small>
      </div>
      <div className="flex flex-col-reverse md:grid md:grid-cols-12 md:gap-5">
        <main
          className={clsx(
            "flex justify-start",
            headings.length > 0 ? "md:col-span-9" : "md:col-span-12",
          )}
        >
          <BlockContent data={project.content} />
        </main>
        <TableOfContents headings={headings} />
      </div>
    </>
  );
}
