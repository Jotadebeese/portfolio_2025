import { GlobalConfig } from "payload";
import { revalidateHomePage } from "./hooks/revalidateHomePage";

export const HomePage: GlobalConfig = {
  slug: "homePage",
  versions: {
    drafts: true,
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Content",
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
        },
        {
          label: "SEO",
          fields: [
            {
              name: "metaTitle",
              type: "text",
              label: "Meta Title",
              admin: {
                description: "Best to keep this under 60 characters.",
              },
            },
            {
              name: "metaDescription",
              type: "textarea",
              label: "Meta Description",
              admin: {
                description: "Best to keep this under 160 characters.",
              },
            },
            {
              name: "metaImage",
              type: "upload",
              relationTo: "media",
              label: "Meta Image",
              admin: {
                description:
                  "This image will be used for social media sharing (Open Graph). Recommended size: 1200x630px.",
              },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHomePage],
  },
};
