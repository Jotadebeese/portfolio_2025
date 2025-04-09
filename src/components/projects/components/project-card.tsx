import { Project } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import Image from "next/image";
import { Media } from "@/payload-types";
import ButtonToLink from "./button-to-link";
import clsx from "clsx";
export default function ProjectCard({ project }: { project: Project }) {
  const icon = project.icon as Media;
  const publishedAt = new Date(project.publishedAt);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(publishedAt);

  return (
    <div className="flex w-full flex-col gap-5 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <small>{formattedDate}</small>
        <div className="flex items-center gap-1">
          <small>
            {project.stage === "indevelopment" ? "In Development" : "Live"}
          </small>
          <div
            className={clsx("h-4 w-4 rounded-full", {
              "bg-amber-600": project.stage === "indevelopment",
              "bg-emerald-600": project.stage === "live",
            })}
          />
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2 sm:flex-row">
        {icon.url && (
          <div className="bg-background border-border-color relative flex h-full w-fit min-w-28 items-center justify-center rounded-2xl border p-4">
            <Image
              src={icon.url}
              alt={icon.alt}
              width={150}
              height={150}
              className="max-h-12.5 w-fit object-contain"
            />
          </div>
        )}
        <div className="flex flex-col justify-center gap-1">
          <h2>{project.title}</h2>
          <RichText className="text-sm" data={project.shortDescription} />
        </div>
      </div>

      <div className="flex flex-grow flex-wrap items-end justify-end gap-4">
        {project.liveUrl && (
          <ButtonToLink url={project.liveUrl} openInNewTab>
            Live
          </ButtonToLink>
        )}
        {project.githubUrl && (
          <ButtonToLink url={project.githubUrl} openInNewTab>
            Github
          </ButtonToLink>
        )}
        {project.individualPage && (
          <ButtonToLink url={`/projects/${project.slug}`}>Details</ButtonToLink>
        )}
      </div>
    </div>
  );
}
