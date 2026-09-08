export function extractHeadingsFromBlocks(blocks: any[]) {
  const headings: { id: string; text: string }[] = [];

  if (!blocks || !Array.isArray(blocks)) return headings;

  blocks.forEach((block) => {
    if (block.blockType === "text" && block.text?.root?.children) {
      block.text.root.children.forEach((node: any) => {
        if (node.type === "heading" && node.tag === "h2") {
          const text = node.children.map((c: any) => c.text).join("");
          const id = text
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");

          headings.push({ id, text });
        }
      });
    }

    if (block.blockType === "tools-workbench") {
      const toolLabels: Record<string, string> = {
        "secret-generator": "UUID & Key Generator",
        "jwt-inspector": "JWT Inspector",
        "image-optimizer": "Image Optimizer",
      };

      const sectionText = block.heading || "Tools Workbench";
      const sectionId =
        sectionText
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") || "tools-workbench";

      headings.push({ id: sectionId, text: sectionText });

      if (Array.isArray(block.defaultTools)) {
        block.defaultTools.forEach((tool: string) => {
          if (toolLabels[tool]) {
            headings.push({
              id: tool,
              text: `↳ ${toolLabels[tool]}`,
            });
          }
        });
      }
    }
  });

  return headings;
}
