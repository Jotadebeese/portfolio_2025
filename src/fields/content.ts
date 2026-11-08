import { Field } from "payload";

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
    {
      slug: "gallery",
      fields: [
        {
          name: "layout",
          type: "select",
          defaultValue: "grid",
          options: [
            { label: "Grid View", value: "grid" },
            { label: "Carousel Slider", value: "carousel" },
            { label: "Masonry View", value: "masonry" },
          ],
          required: true,
        },
        {
          name: "images",
          type: "array",
          label: "Gallery Images",
          minRows: 2,
          required: true,
          fields: [
            {
              name: "image",
              type: "upload",
              relationTo: "media",
              required: true,
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
    {
      slug: "tools-workbench",
      interfaceName: "ToolsWorkbenchBlock",
      labels: {
        singular: "Tools Workbench",
        plural: "Tools Workbenches",
      },
      fields: [
        {
          name: "heading",
          type: "text",
          label: "Section Heading",
          defaultValue: "Tools Workbench",
        },
        {
          name: "description",
          type: "text",
          label: "Section Description",
          defaultValue:
            "A browser-native suite of developer utilities running 100% locally with zero server requests.",
        },
        {
          name: "hideSelector",
          type: "checkbox",
          label: "Hide Tool Selector (Display as standalone tool / single entry)",
          defaultValue: false,
        },
        {
          name: "availableTools",
          type: "select",
          label: "Available Tools",
          hasMany: true,
          admin: {
            description:
              "Choose which tools to include. If empty, all tools are available.",
          },
          options: [
            {
              label: "Cryptographic Keys & UUID v7",
              value: "secret-generator",
            },
            {
              label: "Zero-Knowledge JWT Inspector",
              value: "jwt-inspector",
            },
            {
              label: "Web Image Optimizer",
              value: "image-optimizer",
            },
            {
              label: "Web Video Compressor",
              value: "video-optimizer",
            },
          ],
        },
        {
          name: "defaultTools",
          type: "select",
          label: "Default Opened Tools",
          hasMany: true,
          admin: {
            description:
              "Tools opened on initial load. If none selected, no tools will be opened by default.",
            condition: (_, siblingData) => !siblingData?.hideSelector,
          },
          options: [
            {
              label: "Cryptographic Keys & UUID v7",
              value: "secret-generator",
            },
            {
              label: "Zero-Knowledge JWT Inspector",
              value: "jwt-inspector",
            },
            {
              label: "Web Image Optimizer",
              value: "image-optimizer",
            },
            {
              label: "Web Video Compressor",
              value: "video-optimizer",
            },
          ],
        },
      ],
    },
    {
      slug: "table",
      interfaceName: "TableBlock",
      labels: {
        singular: "Data Table",
        plural: "Data Tables",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "title",
              type: "text",
              label: "Table Title / Heading (Optional)",
              admin: {
                width: "40%",
              },
            },
            {
              name: "caption",
              type: "text",
              label: "Table Subtitle / Caption (Optional)",
              admin: {
                width: "40%",
              },
            },
            {
              name: "variant",
              type: "select",
              defaultValue: "standard",
              label: "Visual Style",
              admin: {
                width: "20%",
              },
              options: [
                {
                  label: "Standard (Borders & Clean Spacing)",
                  value: "standard",
                },
                {
                  label: "Compact (Dense Nutrition & Specs)",
                  value: "compact",
                },
                { label: "Striped (Alternating Row Tints)", value: "striped" },
              ],
            },
          ],
        },
        {
          name: "tableData",
          type: "textarea",
          label: "Table Data (Markdown or TSV)",
          required: true,
          admin: {
            rows: 8,
            description:
              "Paste a markdown table (| Col 1 | Col 2 |) or tab-separated values copied directly from Google Sheets / Excel.",
          },
        },
      ],
    },
    {
      slug: "recipe-scaler",
      interfaceName: "RecipeScalerBlock",
      labels: {
        singular: "Recipe Scaler",
        plural: "Recipe Scalers",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "title",
              type: "text",
              label: "Section Title",
              defaultValue: "Interactive Recipe Scaler",
              admin: {
                width: "40%",
              },
            },
            {
              name: "description",
              type: "text",
              label: "Description (Optional)",
              defaultValue:
                "Adjust the target batch size to automatically recalculate all ingredient amounts.",
              admin: {
                width: "60%",
              },
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "baseYield",
              type: "number",
              label: "Base Batch Size",
              defaultValue: 1000,
              required: true,
              admin: {
                width: "20%",
              },
            },
            {
              name: "yieldUnit",
              type: "text",
              label: "Unit (g, kg, etc.)",
              defaultValue: "g",
              required: true,
              admin: {
                width: "20%",
              },
            },
            {
              name: "yieldLabel",
              type: "text",
              label: "Yield Input Label",
              defaultValue: "Target Batch Size",
              admin: {
                width: "25%",
              },
            },
            {
              name: "presets",
              type: "text",
              label: "Presets (Comma-separated)",
              defaultValue: "500, 1000, 2000, 5000",
              admin: {
                width: "35%",
              },
            },
          ],
        },
        {
          name: "footnote",
          type: "text",
          label: "Footnote / Ratio Note (Optional)",
          admin: {
            description:
              "Optional note displayed below the ingredients (e.g. explaining baker's percentages for this recipe). Leave blank if not needed.",
          },
        },
        {
          name: "sections",
          type: "array",
          label: "Ingredient Sections",
          minRows: 1,
          required: true,
          fields: [
            {
              name: "sectionName",
              type: "text",
              label: "Section Name",
              required: true,
            },
            {
              name: "ingredients",
              type: "array",
              label: "Ingredients",
              minRows: 1,
              required: true,
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "name",
                      type: "text",
                      label: "Ingredient Name",
                      required: true,
                      admin: {
                        width: "40%",
                      },
                    },
                    {
                      name: "amount",
                      type: "number",
                      label: "Base Amount",
                      required: true,
                      admin: {
                        width: "20%",
                      },
                    },
                    {
                      name: "unit",
                      type: "text",
                      label: "Unit (g, ml, m)",
                      defaultValue: "g",
                      required: true,
                      admin: {
                        width: "20%",
                      },
                    },
                    {
                      name: "percentage",
                      type: "number",
                      label: "Baker's % (Opt.)",
                      admin: {
                        width: "20%",
                      },
                    },
                  ],
                },
                {
                  name: "notes",
                  type: "text",
                  label: "Preparation Notes / Sourcing (Optional)",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
