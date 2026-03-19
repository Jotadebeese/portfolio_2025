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
      slug: "code-block",
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
            // Web & UI
            { label: "TypeScript", value: "typescript" },
            { label: "JavaScript", value: "javascript" },
            { label: "TSX (React)", value: "tsx" },
            { label: "JSX (React)", value: "jsx" },
            { label: "HTML", value: "html" },
            { label: "CSS", value: "css" },
            { label: "SCSS/SASS", value: "scss" },
            { label: "Tailwind CSS", value: "postcss" },
            { label: "Vue", value: "vue" },
            { label: "Svelte", value: "svelte" },

            // Backend & Systems
            { label: "Python", value: "python" },
            { label: "Rust", value: "rust" },
            { label: "Go", value: "go" },
            { label: "C++", value: "cpp" },
            { label: "C", value: "c" },
            { label: "C#", value: "csharp" },
            { label: "Java", value: "java" },
            { label: "PHP", value: "php" },
            { label: "Ruby", value: "ruby" },

            // Terminal & Shell (Great for AI/Model training logs)
            { label: "Bash / Terminal", value: "bash" },
            { label: "Shell", value: "shell" },
            { label: "PowerShell", value: "powershell" },

            // Data, Config & Query
            { label: "JSON", value: "json" },
            { label: "YAML", value: "yaml" },
            { label: "TOML", value: "toml" },
            { label: "XML", value: "xml" },
            { label: "GraphQL", value: "graphql" },
            { label: "SQL", value: "sql" },
            { label: "Prisma", value: "prisma" },

            // Documentation
            { label: "Markdown", value: "markdown" },
            { label: "MDX", value: "mdx" },

            // DevOps
            { label: "Dockerfile", value: "docker" },
            { label: "Nginx", value: "nginx" },

            // Fallback
            { label: "Plain Text", value: "text" },
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
