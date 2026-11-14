import clsx from "clsx";
import { Project } from "@/payload-types";
import ProjectsContainer from "../components/projects-container";
import ProjectCard from "../components/project-card";
import { getAllProjects } from "@/lib/payload/actions";

function SectionHeader({
  id,
  headingId,
  title,
  subtitle,
  count,
  className,
}: {
  id: string;
  headingId: string;
  title: string;
  subtitle: string;
  count?: number;
  className?: string;
}) {
  return (
    <header
      id={id}
      className={clsx(
        "border-border-color scroll-mt-24 border-t border-dashed pt-6 pb-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={headingId}>{title}</h2>
          <p className="text-foreground/70 text-sm">{subtitle}</p>
        </div>

        {typeof count === "number" && (
          <small className="text-foreground/70 hidden tabular-nums sm:inline">
            {count} {count === 1 ? "project" : "projects"}
          </small>
        )}
      </div>
    </header>
  );
}

function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ProjectsContainer>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            featured={Boolean(project.fullWidth)}
          />
        ))}
      </ProjectsContainer>
    </div>
  );
}

export default async function ProjectsSection() {
  const projects = await getAllProjects();
  const productProjects = projects.filter(
    (project) => project.category !== "client",
  );
  const clientProjects = projects.filter(
    (project) => project.category === "client",
  );

  return (
    <div className="mt-12 flex flex-col pb-10 sm:mt-14">
      <section aria-labelledby="projects-heading">
        <SectionHeader
          id="projects"
          headingId="projects-heading"
          title="Projects & Products"
          subtitle="Tools, products, and technical experiments."
          count={productProjects.length}
        />

        {productProjects.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="border-border-color flex w-full border-t border-dashed pt-4">
              <p className="font-light">
                Work in progress, nothing to see here.
              </p>
            </div>
          </div>
        ) : (
          <ProjectGrid projects={productProjects} />
        )}
      </section>

      {clientProjects.length > 0 && (
        <section aria-labelledby="client-work-heading" className="mt-16 sm:mt-20">
          <SectionHeader
            id="client-work"
            headingId="client-work-heading"
            title="Client Work"
            subtitle="Websites and systems shipped for real businesses."
            count={clientProjects.length}
          />
          <ProjectGrid projects={clientProjects} />
        </section>
      )}
    </div>
  );
}
