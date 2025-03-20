import { Project } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div>
      <h2>{project.title}</h2>
      <RichText data={project.shortDescription} />
    </div>
  );
}
