import { getPayload } from "payload";
import config from "@payload-config";
import ProjectsContainer from "../components/projects-container";
import ProjectCard from "../components/project-card";

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

  return (
    <ProjectsContainer>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </ProjectsContainer>
  );
}
