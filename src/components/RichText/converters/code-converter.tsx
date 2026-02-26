import { JSXConverters } from "@payloadcms/richtext-lexical/react";

export const codeConverter: JSXConverters<any> = {
  code: ({ node }) => {
    const codeText = node.children
      ? node.children.map((c: any) => c.text).join("")
      : "";

    return (
      <pre className="my-6 overflow-x-auto rounded-lg bg-[#1e1e1e] p-4 text-sm text-gray-100 shadow-sm">
        <code>{codeText}</code>
      </pre>
    );
  },
};
