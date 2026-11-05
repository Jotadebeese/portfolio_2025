import { SerializedHeadingNode } from "@payloadcms/richtext-lexical";
import { JSXConverters } from "@payloadcms/richtext-lexical/react";
import { Link2 } from "lucide-react";

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

export const headingConverter: JSXConverters<SerializedHeadingNode> = {
  heading: ({ node, nodesToJSX }) => {
    if (node.tag === "h2" || node.tag === "h3") {
      const text = nodesToJSX({ nodes: node.children });
      const raw = extractRawText(node.children);
      const id = slugifyHeading(
        raw || (Array.isArray(text) ? text.join("") : String(text)),
      );

      const Tag = node.tag;
      const isH2 = node.tag === "h2";

      return (
        <Tag id={id} className="text-foreground scroll-mt-24">
          <a
            href={`#${id}`}
            className="hover:text-code-rust! text-foreground! group no-underline! transition-all"
          >
            {text}
            <span className="text-foreground/50 group-hover:text-foreground ml-2 inline-block transition-all">
              <Link2 size={isH2 ? 20 : 16} className="inline" />
            </span>
          </a>
        </Tag>
      );
    } else {
      const text = nodesToJSX({ nodes: node.children });
      const Tag = node.tag;
      return <Tag>{text}</Tag>;
    }
  },
};
