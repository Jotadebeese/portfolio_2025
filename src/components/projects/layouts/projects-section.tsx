import { getPayload } from "payload";
import config from "@payload-config";
import ProjectsContainer from "../components/projects-container";
import ProjectCard from "../components/project-card";
import { Project } from "@/payload-types";

export default async function ProjectsSection() {
  const payload = await getPayload({ config });

  const projectsData = await payload.find({
    collection: "projects",
    where: {
      _status: { equals: "published" },
    },
    sort: "-publishedAt",
    depth: 2,
  });

  const projects = projectsData.docs;
  const projectsByYear = projects.reduce(
    (acc, project) => {
      const year = new Date(project.publishedAt).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(project);
      return acc;
    },
    {} as Record<string, Project[]>,
  );
  const sortedProjects = Object.entries(projectsByYear).sort(
    ([yearA], [yearB]) => Number(yearB) - Number(yearA),
  );

  return (
    <div className="flex flex-col gap-8 py-10">
      {projects.length === 0 ? (
        <div className="border-border-color flex w-full border-t border-dashed pt-4">
          <p className="font-light">Work in progress, nothing to see here.</p>
        </div>
      ) : (
        sortedProjects.map(([year, projects]) => (
          <div key={year} className="flex flex-col gap-4">
            <div className="border-border-color flex w-full justify-end border-b border-dashed">
              <h3>{year}</h3>
            </div>
            <ProjectsContainer>
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </ProjectsContainer>
          </div>
        ))
      )}
    </div>
  );
}
