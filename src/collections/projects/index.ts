import { formatSlugHook } from "@/fields/slug/formatSlug";
import type { CollectionConfig } from "payload";
import { revalidateDelete, revalidateProject } from "./hooks/revalidateProject";
import { contentField } from "@/fields/content";

export const Projects: CollectionConfig = {
  slug: "projects",
  orderable: true,
  labels: {
    singular: "Project",
    plural: "Projects",
  },
  admin: {
    useAsTitle: "title",
    group: "Projects",
    defaultColumns: ["title", "stage", "fullWidth", "publishedAt", "_status"],
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
      name: "fullWidth",
      type: "checkbox",
      label: "Full Width Card",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "If enabled, this card spans full width (2 columns) in the Bento grid instead of half width.",
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
      type: "tabs",
      tabs: [
        {
          label: "Content",
          fields: [
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
              label: "Logo / Icon",
              type: "upload",
              relationTo: "media",
              admin: {
                description:
                  "Upload a brand icon or logo (SVG/PNG/WebP) displayed at the right of the project title.",
              },
            },
            {
              name: "video",
              label: "Demo Loop Video",
              type: "upload",
              relationTo: "media",
              admin: {
                description:
                  "Upload a short muted loop video (MP4/WebM) displayed inside the project card.",
              },
            },
            contentField,
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
    afterChange: [revalidateProject],
    afterDelete: [revalidateDelete],
  },
};
