import React from "react";
import clsx from "clsx";
import { Link2 } from "lucide-react";

export type BlockTableProps = {
  title?: string | null;
  caption?: string | null;
  tableData: string;
  variant?: "standard" | "compact" | "striped" | null;
  className?: string;
};

type Alignment = "left" | "center" | "right" | null;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function splitRow(line: string, delimiter: string | null): string[] {
  if (delimiter) return line.split(delimiter).map((c) => c.trim());
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseTable(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const isMarkdown = lines[0].includes("|");
  const delimiter = isMarkdown ? null : lines[0].includes("\t") ? "\t" : ",";

  const headers = splitRow(lines[0], delimiter);
  let alignments: Alignment[] = [];
  let start = 1;

  if (isMarkdown && lines[1] && /^\|?[\s:\-|]+\|?$/.test(lines[1])) {
    alignments = splitRow(lines[1], null).map((sep) => {
      const left = sep.startsWith(":");
      const right = sep.endsWith(":");
      if (left && right) return "center";
      if (right) return "right";
      if (left) return "left";
      return null;
    });
    start = 2;
  }

  const rows = lines
    .slice(start)
    .map((l) => splitRow(l, delimiter))
    .filter((cells) => cells.some(Boolean));

  return { headers, alignments, rows };
}

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <span key={i}>{part.slice(2, -2)}</span>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={i}
          className="text-code-rust bg-code-light-gray border-code-silver rounded-md border px-1.5 py-0.5 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const SUB_ROW = /^[—–-]\s+/;

export default function BlockTable({
  title,
  caption,
  tableData,
  variant = "standard",
  className,
}: BlockTableProps) {
  if (!tableData || typeof tableData !== "string") return null;

  const table = parseTable(tableData);
  if (!table) return null;

  const { headers, alignments, rows } = table;
  const id = title ? slugify(title) : undefined;
  const isCompact = variant === "compact";
  const isStriped = variant === "striped";

  const alignFor = (col: number) =>
    alignments[col] || (col === 0 ? "left" : "right");

  const alignClass = (col: number) => {
    const a = alignFor(col);
    return a === "center"
      ? "text-center"
      : a === "right"
        ? "text-right"
        : "text-left";
  };

  return (
    <section
      id={id}
      className={clsx("flex w-full scroll-mt-24 flex-col gap-2", className)}
    >
      {(title || caption) && (
        <div className="flex flex-col gap-1 pb-2">
          {title && (
            <h2 className="text-foreground">
              <a
                href={`#${id}`}
                className="group hover:text-code-rust transition-all"
              >
                {title}
                <span className="text-foreground/50 group-hover:text-foreground ml-2 inline-block transition-all">
                  <Link2 size={20} className="inline" />
                </span>
              </a>
            </h2>
          )}
          {caption && <p className="text-foreground leading-7">{caption}</p>}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-lg bg-white p-2.5">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-utils-scent-gray-01/40 border-b">
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={clsx(
                    "text-foreground/70 p-2 text-xs font-normal tracking-wider whitespace-nowrap uppercase",
                    alignClass(i),
                  )}
                >
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const isSubRow = SUB_ROW.test(row[0] || "");

              return (
                <tr
                  key={rIdx}
                  className={clsx(
                    "border-utils-scent-gray-01/40 hover:bg-utils-scent-gray-01/15 border-b transition-all last:border-b-0",
                    isStriped && rIdx % 2 === 1 && "bg-background/40",
                  )}
                >
                  {headers.map((_, cIdx) => {
                    const cell = row[cIdx] ?? "";
                    const isLabel = cIdx === 0;
                    const content =
                      isLabel && isSubRow ? cell.replace(SUB_ROW, "") : cell;
                    const isShortValue = !isLabel && content.length <= 28;

                    return (
                      <td
                        key={cIdx}
                        className={clsx(
                          "px-2",
                          isCompact ? "py-1.5" : "py-2",
                          alignClass(cIdx),
                          isLabel
                            ? isSubRow
                              ? "text-foreground/60 pl-6"
                              : "text-foreground"
                            : clsx(
                                isShortValue
                                  ? "font-mono whitespace-nowrap tabular-nums"
                                  : "leading-relaxed",
                                isSubRow
                                  ? "text-foreground/60"
                                  : "text-foreground/80",
                              ),
                        )}
                      >
                        {renderInline(content)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
