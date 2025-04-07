import { GlobalConfig } from "payload";
import { revalidateHomePage } from "./hooks/revalidateHomePage";

export const HomePage: GlobalConfig = {
  slug: "homePage",
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      label: "Title",
      type: "richText",
      required: true,
    },
    {
      name: "subTitle",
      label: "Sub Title",
      type: "richText",
      required: true,
    },
    {
      name: "shortDescription",
      label: "Short Description",
      type: "richText",
      required: true,
    },
  ],
  hooks: {
    afterChange: [revalidateHomePage],
  },
};
