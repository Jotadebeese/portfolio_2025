import { formatSlugHook } from "@/fields/slug/formatSlug";
import type { CollectionConfig } from "payload";
import { revalidateDelete, revalidateProject } from "./hooks/revalidateProject";

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
      name: "projectType",
      type: "relationship",
      relationTo: "tags",
      hasMany: true,
      admin: {
        position: "sidebar",
        isSortable: true,
      },
    },
    {
      name: "technologies",
      type: "relationship",
      relationTo: "techs",
      hasMany: true,
      admin: {
        position: "sidebar",
        isSortable: true,
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
      name: "liveUrl",
      type: "text",
      label: "Live URL",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "githubUrl",
      type: "text",
      label: "GitHub URL",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "individualPage",
      type: "checkbox",
      label: "Individual Page",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "If enabled, this project will have its own page",
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
      name: "title",
      type: "text",
      required: true,
      label: "Title",
    },
    {
      name: "shortDescription",
      type: "richText",
      label: "Short Description",
      required: true,
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
    afterChange: [revalidateProject],
    afterDelete: [revalidateDelete],
  },
};
