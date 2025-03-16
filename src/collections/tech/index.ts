import type { CollectionConfig } from "payload";

export const Tech: CollectionConfig = {
  slug: "techs",
  labels: {
    singular: "Technology",
    plural: "Technologies",
  },
  admin: {
    useAsTitle: "name",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      label: "Name",
    },
    {
      name: "icon",
      type: "upload",
      relationTo: "media",
      required: true,
      label: "Icon",
      displayPreview: true,
    },
  ],
};
