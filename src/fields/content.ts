import { Field } from "payload";
import { Code } from "@/blocks/code";

export const contentField: Field = {
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
    {
      slug: "code",
      interfaceName: "CodeBlock",
      labels: {
        singular: "Code Snippet",
        plural: "Code Snippets",
      },
      fields: [
        {
          name: "language",
          type: "select",
          defaultValue: "typescript",
          options: [
            { label: "TypeScript", value: "typescript" },
            { label: "JavaScript", value: "javascript" },
            { label: "CSS", value: "css" },
            { label: "HTML", value: "html" },
            { label: "JSON", value: "json" },
            { label: "Python", value: "python" },
          ],
        },
        {
          name: "code",
          type: "code",
          required: true,
        },
      ],
    },
  ],
};
