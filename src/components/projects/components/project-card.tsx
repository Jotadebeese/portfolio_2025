import { Media, Project, Tag } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import clsx from "clsx";
import { Scan } from "lucide-react";
import Image from "next/image";
import ButtonToLink from "./button-to-link";
import ProjectLoopVideo from "./project-loop-video";

export default function ProjectCard({
  project,
  index = 1,
  featured = false,
}: {
  project: Partial<Project>;
  index?: number;
  featured?: boolean;
}) {
  const logoMedia =
    project.icon && typeof project.icon === "object"
      ? (project.icon as Media)
      : null;

  const videoMedia =
    project.video && typeof project.video === "object"
      ? (project.video as Media)
      : null;

  const publishedAt = project.publishedAt
    ? new Date(project.publishedAt)
    : new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(publishedAt);

  const logoUrl = logoMedia?.sizes?.thumbnail?.url || logoMedia?.url || "";
  const formattedIndex = String(index).padStart(2, "0");

  const projectTypes = (
    Array.isArray(project.projectType) ? project.projectType : []
  ) as Tag[];

  const isFullWidth = featured || Boolean(project.fullWidth);
  const hasVideo = Boolean(videoMedia?.url);

  return (
    <div
      className={clsx(
        "flex w-full flex-col justify-between overflow-hidden rounded-lg bg-white shadow-sm",
        isFullWidth && "md:col-span-2",
        isFullWidth && hasVideo && "lg:grid lg:grid-cols-12 lg:items-stretch",
      )}
    >
      {videoMedia?.url && (
        <div
          className={clsx(
            "overflow-hidden",
            isFullWidth ? "lg:col-span-7" : "w-full",
          )}
        >
          <ProjectLoopVideo
            src={videoMedia.url}
            mimeType={videoMedia.mimeType}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div
        className={clsx(
          "flex flex-1 flex-col justify-between gap-5 p-4",
          isFullWidth && hasVideo ? "lg:col-span-5" : "w-full",
        )}
      >
        {/* Top Row: [01] on left, [Sep 2026] + [• Live] pill on right */}
        <div className="flex w-full items-center justify-between gap-2">
          <span className="bg-utils-scent-gray-01/75 text-foreground rounded px-1.5 py-0.5 font-mono text-[11px] font-medium">
            {formattedIndex}
          </span>

          <div className="flex items-center gap-2">
            <small className="text-foreground/65">{formattedDate}</small>
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                project.stage === "indevelopment"
                  ? "border-code-blue/25 bg-code-blue/8 text-code-blue"
                  : "border-code-green/25 bg-code-green/8 text-code-green",
              )}
            >
              <span
                className={clsx("h-1.5 w-1.5 rounded-full", {
                  "bg-code-blue": project.stage === "indevelopment",
                  "bg-code-green": project.stage === "live",
                })}
              />
              <span>
                {project.stage === "indevelopment" ? "In Development" : "Live"}
              </span>
            </span>
          </div>
        </div>

        {/* Body Row: Title + Right Logo Badge + Description + Tags */}
        <div className="flex w-full flex-col justify-center gap-1.5">
          <div className="flex w-full items-center justify-between gap-3">
            <h2>{project.title || "Untitled Project"}</h2>

            {logoUrl && (
              <div className="bg-background flex h-8 shrink-0 items-center justify-center rounded-lg px-2.5 py-1">
                {logoUrl.endsWith(".svg") ? (
                  <img
                    src={logoUrl}
                    alt={logoMedia?.alt || `${project.title} logo`}
                    width={72}
                    height={20}
                    loading="lazy"
                    className="max-h-5 w-auto object-contain"
                  />
                ) : (
                  <Image
                    src={logoUrl}
                    alt={logoMedia?.alt || `${project.title} logo`}
                    width={72}
                    height={20}
                    className="max-h-5 w-auto object-contain"
                    placeholder={logoMedia?.blurData ? "blur" : "empty"}
                    blurDataURL={logoMedia?.blurData || undefined}
                  />
                )}
              </div>
            )}
          </div>

          {project.shortDescription && (
            <RichText className="text-sm" data={project.shortDescription} />
          )}

          {projectTypes && projectTypes.length > 0 && (
            <ul className="mt-1 flex flex-wrap items-center gap-2">
              {projectTypes.map((tag) => (
                <li
                  key={tag.id}
                  style={{
                    ["--tag-color" as any]: tag.color || "#666",
                    color: "color-mix(in srgb, var(--tag-color), #000 35%)",
                  }}
                  className="flex w-fit items-center gap-1 rounded-md bg-[var(--tag-color)]/10 px-1.5"
                >
                  <Scan size={12} />
                  <small>{tag.name}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom Row: Action Links */}
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
            <ButtonToLink url={`/projects/${project.slug}`}>
              Details
            </ButtonToLink>
          )}
        </div>
      </div>
    </div>
  );
}
