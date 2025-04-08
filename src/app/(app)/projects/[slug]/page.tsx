import BlockContent from "@/components/common/block-content";
import { getProjectBySlug } from "@/lib/payload/actions";
import { notFound } from "next/navigation";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return notFound();
  }

  return <BlockContent data={project.content} />;
}
