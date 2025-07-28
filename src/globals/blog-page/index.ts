import { GlobalConfig } from "payload";
import { revalidateBlogPage } from "./hooks/revalidateBlogPage";

export const BlogPage: GlobalConfig = {
  slug: "blogPage",
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      label: "Title",
      type: "text",
    },
    {
      name: "shortDescription",
      label: "Short Description",
      type: "richText",
      required: true,
    },
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media",
      label: "Featured Image",
      required: true,
    },
  ],
  hooks: {
    afterChange: [revalidateBlogPage],
  },
};
