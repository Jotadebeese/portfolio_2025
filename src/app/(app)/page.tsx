import ProjectsSection from "@/components/projects/layouts/projects-section";
import { getHomePage } from "@/lib/payload/actions";
import { RichText } from "@payloadcms/richtext-lexical/react";

export default async function Home() {
  const homePage = await getHomePage();

  return (
    <div className="w-full px-2.5 pt-20 sm:px-5">
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <RichText className="text-7xl md:text-[10rem]" data={homePage.title} />

        <div className="flex flex-col gap-5">
          <RichText className="text-xl md:text-2xl" data={homePage.subTitle} />

          <RichText className="text-base" data={homePage.shortDescription} />
        </div>
      </div>
      <ProjectsSection />
    </div>
  );
}
