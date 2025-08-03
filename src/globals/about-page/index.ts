import { GlobalConfig } from "payload";
import { revalidateAboutPage } from "./hooks/revalidateAboutPage";

export const AboutPage: GlobalConfig = {
  slug: "about",
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
    afterChange: [revalidateAboutPage],
  },
};
