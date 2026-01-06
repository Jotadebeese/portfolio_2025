import { revalidatePath, revalidateTag } from "next/cache";
import type { CollectionConfig } from "payload";

export const Tags: CollectionConfig = {
  slug: "tags",
  labels: {
    singular: "Tag",
    plural: "Tags",
  },
  admin: {
    useAsTitle: "name",
    group: "Projects",
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
          payload.logger.info(`Revalidating home page after tag change`);
          revalidateTag("home-page", { expire: 0 });
          revalidatePath("/");
        }
        return doc;
      },
    ],
  },
};
