import type { CollectionConfig } from "payload";

export const Projects: CollectionConfig = {
  slug: "projects",
  fields: [
    {
      name: "title",
      type: "text",
    },
    {
      name: "shortDescription",
      type: "richText",
    },
    {
      name: "link",
      type: "text",
    },
    {
      name: "icon",
      type: "upload",
      relationTo: "media",
    },
  ],
};
