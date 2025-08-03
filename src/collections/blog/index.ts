import { formatSlugHook } from "@/fields/slug/formatSlug";
import type { CollectionConfig } from "payload";
import { revalidateBlog, revalidateDetete } from "./hooks/revalidateBlog";

export const Blog: CollectionConfig = {
  slug: "blog",
  admin: {
    useAsTitle: "title",
    group: "Notes",
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [formatSlugHook("title")],
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "featuredImage",
      type: "upload",
      relationTo: "media",
      label: "Featured Image",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "blogTags",
      type: "relationship",
      relationTo: "blogTags",
      hasMany: true,
      admin: {
        position: "sidebar",
        isSortable: true,
      },
    },
    {
      name: "publishedAt",
      type: "date",
      required: true,
      label: "Date Published",
      admin: {
        date: {
          displayFormat: "dd/MM/yyyy",
        },
        position: "sidebar",
      },
    },
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
              required: true,
            },
            {
              name: "shortDescription",
              label: "Short Description",
              type: "richText",
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
    afterChange: [revalidateBlog],
    afterDelete: [revalidateDetete],
  },
};
