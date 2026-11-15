import { JSXConverters } from "@payloadcms/richtext-lexical/react";

type LexicalNode = {
  type?: string;
  children?: LexicalNode[];
  [key: string]: unknown;
};

function flattenParagraphChildren(nodes: LexicalNode[]): LexicalNode[] {
  const flattened: LexicalNode[] = [];
  for (const child of nodes) {
    if (child?.type === "paragraph" && Array.isArray(child.children)) {
      flattened.push(...flattenParagraphChildren(child.children));
    } else {
      flattened.push(child);
    }
  }
  return flattened;
}

/**
 * Prevents invalid nested `<p><p>...</p></p>` markup (and React hydration
 * mismatches) when CMS Lexical JSON contains a paragraph node inside another.
 */
export const paragraphConverter: JSXConverters = {
  paragraph: ({ node, nodesToJSX }) => {
    const rawChildren = Array.isArray(node.children)
      ? (node.children as LexicalNode[])
      : [];

    const hasNestedParagraph = rawChildren.some(
      (child) => child?.type === "paragraph",
    );

    if (hasNestedParagraph) {
      if (rawChildren.every((child) => child?.type === "paragraph")) {
        return <>{nodesToJSX({ nodes: node.children })}</>;
      }

      const normalizedNodes = flattenParagraphChildren(rawChildren);
      const children = nodesToJSX({ nodes: normalizedNodes as any });
      if (!children?.length) {
        return (
          <p>
            <br />
          </p>
        );
      }
      return <p>{children}</p>;
    }

    const children = nodesToJSX({ nodes: node.children });
    if (!children?.length) {
      return (
        <p>
          <br />
        </p>
      );
    }
    return <p>{children}</p>;
  },
};
