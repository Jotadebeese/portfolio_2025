import { JSXConverters } from "@payloadcms/richtext-lexical/react";

export const linkConverter: JSXConverters = {
  link: ({ node, nodesToJSX }) => {
    const newTab = node.fields?.newTab;
    return (
      <a
        href={node.fields?.url}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
      >
        {nodesToJSX({ nodes: node.children })}
      </a>
    );
  },
};
