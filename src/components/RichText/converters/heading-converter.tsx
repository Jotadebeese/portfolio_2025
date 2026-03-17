import { SerializedHeadingNode } from "@payloadcms/richtext-lexical";
import { JSXConverters } from "@payloadcms/richtext-lexical/react";
import { Link2 } from "lucide-react";

export const headingConverter: JSXConverters<SerializedHeadingNode> = {
  heading: ({ node, nodesToJSX }) => {
    if (node.tag === "h2") {
      const text = nodesToJSX({ nodes: node.children });

      const id = text
        .join("")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      return (
        <h2 id={id} className="text-foreground scroll-mt-24">
          <a
            href={`#${id}`}
            className="hover:text-code-rust! text-foreground! group no-underline! transition-all"
          >
            {text}
            <span className="text-foreground/50 group-hover:text-foreground ml-2 inline-block transition-all">
              <Link2 size={20} className="inline" />
            </span>
          </a>
        </h2>
      );
    } else {
      const text = nodesToJSX({ nodes: node.children });
      const Tag = node.tag;
      return <Tag>{text}</Tag>;
    }
  },
};
