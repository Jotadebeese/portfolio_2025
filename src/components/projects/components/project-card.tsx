import { Project } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import Image from "next/image";
import { Media, Tag } from "@/payload-types";
export default function ProjectCard({ project }: { project: Project }) {
  const icon = project.icon as Media;
  const publishedAt = new Date(project.publishedAt);
  console.log(project.projectType);
  return (
    <div className="flex w-full flex-col gap-5 rounded-lg bg-white p-5 shadow-xs">
      <div className="flex w-full items-center justify-between">
        <small>{publishedAt.toDateString()}</small>
        <div className="flex items-center gap-1">
          <small>
            {project.stage === "indevelopment" ? "In Development" : "Live"}
          </small>
          <div className="h-4 w-4 rounded-full bg-amber-600"></div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2 md:flex-row">
        {icon.url && (
          <div className="border-border-color relative flex w-fit items-center justify-center rounded-lg border p-2">
            <Image
              src={icon.url}
              alt={icon.alt}
              width={150}
              height={150}
              className="max-h-12.5 w-fit object-contain"
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h2>{project.title}</h2>
          {project.projectType &&
            project.projectType.map((type) => {
              return <small key={type.id}>{type.name}</small>;
            })}
        </div>
      </div>

      <RichText data={project.shortDescription} />
    </div>
  );
}
