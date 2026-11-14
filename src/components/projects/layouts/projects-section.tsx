import { Project } from "@/payload-types";
import ProjectsContainer from "../components/projects-container";
import ProjectCard from "../components/project-card";
import { getAllProjects } from "@/lib/payload/actions";

function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="flex flex-col gap-4 pt-4">
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
    <div className="flex flex-col pb-10">
      {productProjects.length === 0 ? (
        <div className="flex flex-col gap-4 pt-4">
          <div className="border-border-color flex w-full border-t border-dashed pt-4">
            <p className="font-light">Work in progress, nothing to see here.</p>
          </div>
        </div>
      ) : (
        <ProjectGrid projects={productProjects} />
      )}

      {clientProjects.length > 0 && (
        <>
          <h2
            id="client-work"
            className="border-border-color mt-12 scroll-mt-24 border-t border-dashed pt-6 font-extralight! sm:mt-14 sm:pt-8"
          >
            Client Work
          </h2>
          <ProjectGrid projects={clientProjects} />
        </>
      )}
    </div>
  );
}
