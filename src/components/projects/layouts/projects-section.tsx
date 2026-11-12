import ProjectsContainer from "../components/projects-container";
import ProjectCard from "../components/project-card";
import { getAllProjects } from "@/lib/payload/actions";

export default async function ProjectsSection() {
  const projects = await getAllProjects();

  return (
    <div className="flex flex-col gap-4 pt-4 pb-10">
      {projects.length === 0 ? (
        <div className="border-border-color flex w-full border-t border-dashed pt-4">
          <p className="font-light">Work in progress, nothing to see here.</p>
        </div>
      ) : (
        <ProjectsContainer>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              featured={Boolean(project.fullWidth)}
            />
          ))}
        </ProjectsContainer>
      )}
    </div>
  );
}
