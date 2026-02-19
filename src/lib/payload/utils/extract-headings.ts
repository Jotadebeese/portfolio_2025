export function extractHeadings(content: any) {
  if (!content || !content.root || !content.root.children) return [];

  const headings: { id: string; text: string; level: number }[] = [];

  content.root.children.forEach((node: any) => {
    if (node.type === "heading") {
      const text = node.children.map((c: any) => c.text).join("");

      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      headings.push({
        id,
        text,
        level: node.tag === "h2" ? 2 : 3,
      });
    }
  });

  return headings;
}
