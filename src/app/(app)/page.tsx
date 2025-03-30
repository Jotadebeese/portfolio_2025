import ProjectsSection from "@/components/projects/layouts/projects-section";
import Image from "next/image";

export default function Home() {
  return (
    <div className="w-full px-2.5 pt-20 sm:px-5">
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <h1 className="text-7xl md:text-[10rem]">
          Hey!
          <br />
          I'm Juan
        </h1>
        <div className="flex flex-col gap-5">
          <p className="text-xl md:text-2xl">
            A Software Developer, with background in electronics engineering and
            a big passion in AI.
          </p>
          <small className="text-base">
            I'll be posting my projects and learnings here, as well as anything
            else I find interesting.
          </small>
        </div>
      </div>
      <ProjectsSection />
    </div>
  );
}
