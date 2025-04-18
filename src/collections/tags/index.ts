import type { CollectionConfig } from "payload";

export const Tags: CollectionConfig = {
  slug: "tags",
  labels: {
    singular: "Tag",
    plural: "Tags",
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
      name: "color",
      type: "text",
      label: "Color",
      required: true,
      defaultValue: "#ffffff",
      admin: {
        components: {
          Field: "@/fields/ColorPicker",
        },
      },
    },
  ],
};
