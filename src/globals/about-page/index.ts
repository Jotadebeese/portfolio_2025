import { GlobalConfig } from "payload";
import { revalidateAboutPage } from "./hooks/revalidateAboutPage";

export const AboutPage: GlobalConfig = {
  slug: "about",
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
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
    {
      name: "content",
      type: "blocks",
      label: "Content",
      required: true,
      blocks: [
        {
          slug: "text",
          fields: [
            {
              name: "text",
              type: "richText",
              label: "Text Content",
              required: true,
            },
          ],
        },
        {
          slug: "image",
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              required: true,
              label: "Image",
            },
            {
              name: "caption",
              type: "text",
              label: "Caption",
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateAboutPage],
  },
};
