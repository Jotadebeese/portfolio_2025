/**
 * Recursively extracts plain text from a Payload CMS Lexical rich text object.
 * Handles nested paragraphs, headings, list items, links, and inline formatting,
 * collapsing whitespace and trimming the output.
 */
export function extractTextFromRichText(richText: any): string {
  if (!richText) return "";
  if (typeof richText === "string") return richText;

  function traverse(node: any): string {
    if (!node) return "";
    if (typeof node.text === "string") {
      return node.text;
    }
    if (Array.isArray(node.children)) {
      const isBlock = [
        "paragraph",
        "heading",
        "list",
        "listitem",
        "quote",
        "root",
      ].includes(node.type);
      const childTexts = node.children.map(traverse);
      return isBlock
        ? childTexts.filter(Boolean).join(" ")
        : childTexts.join("");
    }
    return "";
  }

  const raw = traverse(richText.root || richText);
  return raw.replace(/\s+/g, " ").trim();
}
