import { AVAILABLE_TOOLS } from "@/components/tools/types";

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function extractRawText(nodes: any[]): string {
  if (!Array.isArray(nodes)) return "";
  return nodes
    .map((node) => {
      if (typeof node === "string") return node;
      if (node && typeof node === "object") {
        if ("text" in node && typeof node.text === "string") return node.text;
        if ("children" in node && Array.isArray(node.children)) {
          return extractRawText(node.children);
        }
      }
      return "";
    })
    .join("");
}

export type HeadingItem = {
  id: string;
  text: string;
  level: 2 | 3;
  parentId?: string;
  isWorkbenchParent?: boolean;
  isWorkbenchTool?: boolean;
};

export function extractHeadingsFromBlocks(blocks: any[]): HeadingItem[] {
  const headings: HeadingItem[] = [];

  if (!blocks || !Array.isArray(blocks)) return headings;

  let currentH2Id: string | undefined = undefined;

  blocks.forEach((block) => {
    if (block.blockType === "text" && block.text?.root?.children) {
      block.text.root.children.forEach((node: any) => {
        if (
          node.type === "heading" &&
          (node.tag === "h2" || node.tag === "h3")
        ) {
          const raw = extractRawText(node.children);
          const text = raw.trim();
          if (!text) return;

          const id = slugifyHeading(text);
          const isH2 = node.tag === "h2";

          if (isH2) {
            currentH2Id = id;
            headings.push({
              id,
              text,
              level: 2,
            });
          } else {
            headings.push({
              id,
              text,
              level: 3,
              parentId: currentH2Id,
            });
          }
        }
      });
    }

    if (block.blockType === "recipe-scaler" && block.title?.trim()) {
      const sectionText = block.title.trim();
      const sectionId = slugifyHeading(sectionText);
      currentH2Id = sectionId;

      headings.push({
        id: sectionId,
        text: sectionText,
        level: 2,
      });

      if (Array.isArray(block.sections)) {
        block.sections.forEach((sec: any) => {
          if (sec.sectionName?.trim()) {
            headings.push({
              id: slugifyHeading(sec.sectionName.trim()),
              text: sec.sectionName.trim(),
              level: 3,
              parentId: sectionId,
            });
          }
        });
      }
    }

    if (block.blockType === "table" && block.title?.trim()) {
      const sectionText = block.title.trim();
      const sectionId = slugifyHeading(sectionText);
      currentH2Id = sectionId;

      headings.push({
        id: sectionId,
        text: sectionText,
        level: 2,
      });
    }

    if (block.blockType === "tools-workbench") {
      const customHeading = block.heading?.trim();
      const sectionText =
        customHeading || (!block.hideSelector ? "Tools Workbench" : null);

      let sectionId = "tools-workbench";
      if (sectionText) {
        sectionId = slugifyHeading(sectionText) || "tools-workbench";
        currentH2Id = sectionId;

        headings.push({
          id: sectionId,
          text: sectionText,
          level: 2,
          isWorkbenchParent: true,
        });
      }

      const activeTools = block.hideSelector
        ? block.availableTools?.length
          ? block.availableTools
          : block.defaultTools || []
        : block.defaultTools || [];

      if (Array.isArray(activeTools)) {
        activeTools.forEach((toolId: string) => {
          const def = AVAILABLE_TOOLS.find((t) => t.id === toolId);
          if (def) {
            headings.push({
              id: toolId,
              text: def.name,
              level: 3,
              parentId: sectionId,
              isWorkbenchTool: true,
            });
          }
        });
      }
    }
  });

  return headings;
}
