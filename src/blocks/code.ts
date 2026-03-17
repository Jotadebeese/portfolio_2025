import { Block } from "payload";

export const Code: Block = {
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
};
