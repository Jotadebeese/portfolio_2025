import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import CTAButton from "@/components/common/cta-button";
import ButtonToLink from "@/components/projects/components/button-to-link";
import ToolsWorkbench from "@/components/tools/layout/tools-workbench";
import { getLiveToolById, LIVE_TOOLS } from "@/components/tools/types";

export function generateStaticParams() {
  return LIVE_TOOLS.map((tool) => ({
    tool: tool.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool: toolId } = await params;
  const tool = getLiveToolById(toolId);

  if (!tool) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: tool.name,
    description: tool.shortDesc,
    alternates: {
      canonical: `/${tool.id}`,
    },
    openGraph: {
      title: `${tool.name} | forthweb`,
      description: tool.shortDesc,
    },
  };
}

export default async function ForthwebToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: toolId } = await params;
  const tool = getLiveToolById(toolId);

  if (!tool) {
    notFound();
  }

  const otherTools = LIVE_TOOLS.filter((t) => t.id !== tool.id);

  return (
    <div className="flex w-full flex-col gap-8 px-2.5 pt-8 sm:px-5 sm:pt-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="text-foreground/70 group inline-flex w-fit items-center gap-1 text-sm transition-colors hover:text-amber-600"
        >
          <ChevronLeft
            size={14}
            aria-hidden="true"
            className="transition-transform duration-150 ease-out group-hover:-translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          />
          <span>All tools</span>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl sm:text-5xl">{tool.name}</h1>
            <p className="text-foreground/75 max-w-2xl text-sm sm:text-base">
              {tool.shortDesc}
            </p>
          </div>

          <CTAButton
            href={`/?tools=${tool.id}`}
            variant="secondary"
            size="sm"
            className="w-fit shrink-0"
          >
            <span>Open in Workbench</span>
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="text-foreground/70 group-hover:text-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            />
          </CTAButton>
        </div>
      </div>

      <ToolsWorkbench
        availableTools={[tool.id]}
        defaultTools={[tool.id]}
        hideSelector
        hideHeading
      />

      {otherTools.length > 0 && (
        <section aria-labelledby="more-tools-heading" className="mt-6">
          <header className="border-border-color border-t border-dashed pt-6 pb-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="more-tools-heading">More tools</h2>
                <p className="text-foreground/70 text-sm">
                  Other browser-native utilities running 100% locally.
                </p>
              </div>

              <small className="text-foreground/70 hidden tabular-nums sm:inline">
                {otherTools.length}{" "}
                {otherTools.length === 1 ? "tool" : "tools"}
              </small>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {otherTools.map((other) => (
              <article
                key={other.id}
                className="border-border-color/50 project-card relative isolate flex w-full flex-col rounded-xl border bg-white/30 p-1 backdrop-blur-xs transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none"
              >
                <div className="flex flex-1 flex-col justify-between gap-4 rounded-lg bg-white p-2 sm:p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="bg-utils-scent-gray-01/60 text-foreground inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] sm:py-1 sm:text-xs">
                        {other.apiBadge}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <small>Local</small>
                        <span
                          aria-hidden="true"
                          className="bg-code-green size-2.5 rounded-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h3>
                        <Link
                          href={`/${other.id}`}
                          className="project-card-link after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                        >
                          {other.name}
                        </Link>
                      </h3>
                      <p className="text-foreground/70 text-sm leading-relaxed font-light">
                        {other.shortDesc}
                      </p>
                    </div>
                  </div>

                  <footer className="relative z-1 mt-auto">
                    <div className="border-border-color/50 flex items-center justify-end border-t border-dashed pt-2 sm:pt-3">
                      <ButtonToLink
                        url={`/${other.id}`}
                        ariaLabel={`Open ${other.name}`}
                      >
                        Open tool
                      </ButtonToLink>
                    </div>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
