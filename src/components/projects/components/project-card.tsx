import { Media, Project, Tag } from "@/payload-types";
import { RichText } from "@payloadcms/richtext-lexical/react";
import clsx from "clsx";
import { Scan } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ButtonToLink from "./button-to-link";
import ProjectLoopVideo from "./project-loop-video";

export default function ProjectCard({
  project,
  featured = false,
}: {
  project: Partial<Project>;
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

  const projectTypes = (
    Array.isArray(project.projectType) ? project.projectType : []
  ) as Tag[];

  const isFullWidth = featured || Boolean(project.fullWidth);
  const hasVideo = Boolean(videoMedia?.url);
  const cardLinks = (Array.isArray(project.links) ? project.links : []).filter(
    (link): link is NonNullable<Project["links"]>[number] =>
      Boolean(link?.label?.trim() && link?.url?.trim()),
  );
  const cardClickLink =
    cardLinks.find((link) => Boolean(link.isCardLink)) ?? null;
  const cardClickUrl = cardClickLink?.url.trim() || "";
  const cardClickExternal = cardClickLink?.linkType === "external";

  return (
    <article
      className={clsx(
        "border-border-color/50 flex w-full flex-col rounded-xl border bg-white/30 p-1 backdrop-blur-xs transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
        cardClickLink && "project-card relative isolate",
        isFullWidth && "md:col-span-2",
      )}
    >
      <div
        className={clsx(
          "flex flex-1 flex-col justify-between overflow-hidden rounded-lg bg-white",
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
            "flex flex-1 flex-col gap-5 pt-4",
            cardLinks.length === 0 && "pb-4",
            isFullWidth && hasVideo ? "lg:col-span-5" : "w-full",
          )}
        >
          <div className="flex w-full items-center justify-between gap-2 px-4">
            <small className="text-foreground/70">{formattedDate}</small>
            <div className="flex items-center gap-1.5">
              <small>
                {project.stage === "indevelopment" ? "In Development" : "Live"}
              </small>
              <span
                aria-hidden="true"
                className={clsx("size-2.5 rounded-full", {
                  "bg-code-blue": project.stage === "indevelopment",
                  "bg-code-green": project.stage === "live",
                })}
              />
            </div>
          </div>

          <div className="flex w-full flex-col justify-center gap-1.5 px-4">
            <div className="flex w-full items-center justify-between gap-3">
              <h2>
                {cardClickLink ? (
                  <Link
                    href={cardClickUrl}
                    prefetch={cardClickExternal ? false : undefined}
                    target={cardClickExternal ? "_blank" : undefined}
                    rel={cardClickExternal ? "noopener noreferrer" : undefined}
                    className="project-card-link after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                  >
                    {project.title || "Untitled Project"}
                  </Link>
                ) : (
                  project.title || "Untitled Project"
                )}
              </h2>

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
              <RichText
                className={clsx(
                  "text-sm",
                  cardClickLink && "[&_a]:relative [&_a]:z-1",
                )}
                data={project.shortDescription}
              />
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

          {cardLinks.length > 0 && (
            <footer
              className={clsx(
                "mt-auto px-4 pb-4",
                cardClickLink && "relative z-1",
              )}
            >
              <div className="border-border-color/50 flex flex-wrap items-center justify-end gap-4 border-t border-dashed pt-3">
                {cardLinks.map((link, linkIndex) => {
                  const label = link.label.trim();
                  const url = link.url.trim();
                  const isExternal = link.linkType === "external";

                  return (
                    <ButtonToLink
                      key={link.id || `${label}-${url}-${linkIndex}`}
                      url={url}
                      openInNewTab={isExternal}
                      ariaLabel={
                        project.title ? `${label} — ${project.title}` : label
                      }
                    >
                      {label}
                    </ButtonToLink>
                  );
                })}
              </div>
            </footer>
          )}
        </div>
      </div>
    </article>
  );
}
