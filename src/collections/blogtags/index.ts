import { revalidatePath, revalidateTag } from "next/cache";
import type { CollectionConfig } from "payload";

export const BlogTags: CollectionConfig = {
  slug: "blogTags",
  labels: {
    singular: "Blog Tag",
    plural: "Blog Tags",
  },
  admin: {
    useAsTitle: "name",
    group: "Notes",
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
  hooks: {
    afterChange: [
      async ({ doc, req: { payload, context } }) => {
        if (!context.disableRevalidate) {
          payload.logger.info(`Revalidating blog page after tag change`);
          revalidateTag("blog-page");
          revalidatePath("/notes");
        }
        return doc;
      },
    ],
  },
};
