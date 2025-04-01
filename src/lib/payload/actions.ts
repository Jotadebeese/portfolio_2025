import { Project } from "@/payload-types";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";

const payload = await getPayload({ config });

export const getAllProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const res = await payload.find({
      collection: "projects",
      where: {
        _status: { equals: "published" },
      },
      sort: "-publishedAt",
      depth: 2,
    });
    return res.docs;
  },
  ["all-projects"],
  { tags: ["projects"] },
);
