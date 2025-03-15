import { formatSlugHook } from "@/fields/slug/formatSlug";
import type { CollectionConfig } from "payload";

export const Projects: CollectionConfig = {
  slug: "projects",
  labels: {
    singular: "Project",
    plural: "Projects",
  },
  admin: {
    useAsTitle: "title",
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      label: "Title",
    },
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
    /* {
      name: "tags",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
    }, */
    {
      name: "shortDescription",
      type: "richText",
      label: "Short Description",
      required: true,
    },
    {
      name: "liveUrl",
      type: "text",
      label: "Live URL",
    },
    {
      name: "githubUrl",
      type: "text",
      label: "GitHub URL",
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
      },
    },
    {
      name: "stage",
      type: "select",
      options: [
        { label: "In Development", value: "indevelopment" },
        { label: "Live", value: "live" },
      ],
      defaultValue: "indevelopment",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "icon",
      type: "upload",
      relationTo: "media",
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
              type: "relationship",
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
};
