import crypto from "crypto";
import { formatSlugHook } from "@/fields/slug/formatSlug";
import type { CollectionConfig } from "payload";
import { revalidateBlog, revalidateDelete } from "./hooks/revalidateBlog";
import { contentField } from "@/fields/content";

export const Blog: CollectionConfig = {
  slug: "blog",
  admin: {
    useAsTitle: "title",
    group: "Notes",
    defaultColumns: ["title", "visibility", "publishedAt", "_status"],
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
      name: "visibility",
      type: "select",
      defaultValue: "public",
      required: true,
      options: [
        { label: "Public (Listed & Indexed)", value: "public" },
        { label: "Private (Token Required, Noindex)", value: "private" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Private notes are hidden from /notes, sitemap, and search engines, and require an access token at /notes/p/[slug].",
      },
    },
    {
      name: "accessToken",
      type: "text",
      label: "Access Token",
      hooks: {
        beforeValidate: [
          ({ siblingData, value }) => {
            if (siblingData?.visibility === "private") {
              if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
              }
              return crypto.randomBytes(16).toString("hex");
            }
            return value;
          },
        ],
      },
      admin: {
        position: "sidebar",
        condition: (data) => data?.visibility === "private",
        components: {
          Field: "@/fields/PrivateNoteTokenField",
        },
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
            contentField,

            /*  {
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
            }, */
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
    afterDelete: [revalidateDelete],
  },
};
