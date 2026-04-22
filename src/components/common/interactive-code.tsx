"use client";

import clsx from "clsx";
import { Check, Copy, Moon, Sun } from "lucide-react";
import { useState } from "react";

export default function InteractiveCode({
  html,
  rawCode,
  language,
}: {
  html: string;
  language: string;
  rawCode: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={clsx(
        "group shiki-container relative w-full overflow-hidden rounded-xl text-sm shadow-sm",
        isDark && "local-dark",
      )}
    >
      <div className="bg-utils-scent-gray-01 absolute top-0 left-4 z-1 rounded-b-md px-4 py-1">
        <span className="text-foreground font-mono text-xs uppercase">
          {language}
        </span>
      </div>

      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100">
        <button
          onClick={() => setIsDark(!isDark)}
          className={clsx(
            "border-utils-scent-gray-01 bg-utils-scent-gray-01/60 border text-white shadow-sm transition-all",
            "hover:bg-foreground/80 hover:text-white",
            "flex cursor-pointer items-center justify-center rounded-md p-2",
          )}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={handleCopy}
          className={clsx(
            "border-utils-scent-gray-01 bg-utils-scent-gray-01/60 border text-white shadow-sm transition-all",
            "hover:bg-foreground/80 hover:text-white",
            "flex cursor-pointer items-center justify-center rounded-md p-2",
          )}
          aria-label="Copy code"
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <div
        className="w-full [&>pre]:overflow-x-auto [&>pre]:px-4 [&>pre]:pt-10 [&>pre]:pb-4 [&>pre]:transition-colors [&>pre]:duration-300"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
