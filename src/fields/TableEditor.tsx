"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useField, useForm } from "@payloadcms/ui";
import {
  Table as TableIcon,
  Code as CodeIcon,
  Eye as EyeIcon,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ClipboardPaste,
  Copy,
  Check,
  Undo2,
  X,
} from "lucide-react";
import BlockTable from "@/components/common/block-table";

type Alignment = "left" | "center" | "right";

interface ParsedTable {
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

function splitRow(line: string, delimiter: string | null): string[] {
  if (delimiter) return line.split(delimiter).map((c) => c.trim());
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function createEmptyTable(): ParsedTable {
  return {
    headers: ["Column 1", "Column 2", "Column 3"],
    alignments: ["left", "left", "left"],
    rows: [
      ["", "", ""],
      ["", "", ""],
    ],
  };
}

function parseTableData(raw: string): ParsedTable {
  const trimmed = (raw || "").trim();
  if (!trimmed) return createEmptyTable();

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return createEmptyTable();

  const isMarkdown = lines[0].includes("|");
  const delimiter = isMarkdown
    ? null
    : lines[0].includes("\t")
      ? "\t"
      : lines[0].includes(",")
        ? ","
        : null;

  const headers = splitRow(lines[0], delimiter);
  let alignments: Alignment[] = headers.map(() => "left");
  let start = 1;

  if (isMarkdown && lines[1] && /^\|?[\s:\-|]+\|?$/.test(lines[1])) {
    const rawAlignments = splitRow(lines[1], null);
    alignments = headers.map((_, i) => {
      const sep = rawAlignments[i] || "";
      const left = sep.startsWith(":");
      const right = sep.endsWith(":");
      if (left && right) return "center";
      if (right) return "right";
      return "left";
    });
    start = 2;
  }

  const rows = lines.slice(start).map((l) => {
    const cells = splitRow(l, delimiter);
    while (cells.length < headers.length) cells.push("");
    return cells.slice(0, headers.length);
  });

  if (rows.length === 0) {
    rows.push(headers.map(() => ""));
  }

  return { headers, alignments, rows };
}

function serializeToMarkdown(table: ParsedTable): string {
  const { headers, alignments, rows } = table;
  if (!headers || headers.length === 0) return "";

  const cols = headers.length;
  const colWidths = headers.map((h) => Math.max(3, (h || "").length));

  rows.forEach((row) => {
    for (let c = 0; c < cols; c++) {
      colWidths[c] = Math.max(colWidths[c], (row[c] || "").length);
    }
  });

  const headerLine = `| ${headers
    .map((h, i) => (h || "").padEnd(colWidths[i]))
    .join(" | ")} |`;
  const sepLine = `| ${headers
    .map((_, i) => {
      const align = alignments[i] || "left";
      const w = colWidths[i];
      if (align === "center") return `:${"-".repeat(Math.max(1, w - 2))}:`;
      if (align === "right") return `${"-".repeat(Math.max(2, w - 1))}:`;
      return `:${"-".repeat(Math.max(2, w - 1))}`;
    })
    .join(" | ")} |`;

  const rowLines = rows.map(
    (row) =>
      `| ${headers
        .map((_, i) => (row[i] || "").padEnd(colWidths[i]))
        .join(" | ")} |`,
  );

  return [headerLine, sepLine, ...rowLines].join("\n");
}

function isPlaceholderTable(table: ParsedTable): boolean {
  const defaultHeaders = table.headers.every((h, idx) =>
    new RegExp(`^Column ${idx + 1}$`).test(h.trim()),
  );
  const allRowsBlank = table.rows.every((r) => r.every((c) => !c.trim()));
  return defaultHeaders && allRowsBlank;
}

export default function TableEditor({ path }: { path: string }) {
  const { value, setValue } = useField<string>({ path });
  const { getSiblingData } = useForm();

  const [activeTab, setActiveTab] = useState<"grid" | "raw" | "preview">("grid");
  const [parsed, setParsed] = useState<ParsedTable>(() =>
    parseTableData(value || ""),
  );
  const [rawText, setRawText] = useState<string>(value || "");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState("");
  const [copied, setCopied] = useState(false);
  const [pasteToast, setPasteToast] = useState<{
    message: string;
    undoState: ParsedTable;
  } | null>(null);

  const lastSyncedRef = useRef<string>(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== lastSyncedRef.current) {
      lastSyncedRef.current = value;
      setRawText(value);
      setParsed(parseTableData(value));
    }
  }, [value]);

  const updateTable = useCallback(
    (newTable: ParsedTable) => {
      setParsed(newTable);
      const md = serializeToMarkdown(newTable);
      lastSyncedRef.current = md;
      setRawText(md);
      setValue(md);
    },
    [setValue],
  );

  const focusCell = useCallback((row: number | "header", col: number) => {
    requestAnimationFrame(() => {
      const selector =
        row === "header"
          ? `input[data-tcell="header-${col}"]`
          : `input[data-tcell="${row}-${col}"]`;
      const el = containerRef.current?.querySelector<HTMLInputElement>(selector);
      el?.focus();
    });
  }, []);

  const handleRawChange = (newRaw: string) => {
    lastSyncedRef.current = newRaw;
    setRawText(newRaw);
    setValue(newRaw);
    setParsed(parseTableData(newRaw));
  };

  const handleHeaderChange = (colIndex: number, text: string) => {
    const newHeaders = [...parsed.headers];
    newHeaders[colIndex] = text;
    updateTable({ ...parsed, headers: newHeaders });
  };

  const toggleAlignment = (colIndex: number) => {
    const current = parsed.alignments[colIndex] || "left";
    const next: Alignment =
      current === "left" ? "center" : current === "center" ? "right" : "left";
    const newAlignments = [...parsed.alignments];
    newAlignments[colIndex] = next;
    updateTable({ ...parsed, alignments: newAlignments });
  };

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    text: string,
  ) => {
    const newRows = parsed.rows.map((r, rIdx) => {
      if (rIdx !== rowIndex) return r;
      const newRow = [...r];
      newRow[colIndex] = text;
      return newRow;
    });
    updateTable({ ...parsed, rows: newRows });
  };

  const addRow = (focusCol?: number) => {
    const newRow = parsed.headers.map(() => "");
    const nextIndex = parsed.rows.length;
    updateTable({ ...parsed, rows: [...parsed.rows, newRow] });
    if (typeof focusCol === "number") {
      focusCell(nextIndex, focusCol);
    }
  };

  const deleteRow = (rowIndex: number) => {
    if (parsed.rows.length <= 1) {
      updateTable({ ...parsed, rows: [parsed.headers.map(() => "")] });
      return;
    }
    const newRows = parsed.rows.filter((_, idx) => idx !== rowIndex);
    updateTable({ ...parsed, rows: newRows });
  };

  const addColumn = () => {
    const newColNum = parsed.headers.length + 1;
    const newHeaders = [...parsed.headers, `Column ${newColNum}`];
    const newAlignments: Alignment[] = [...parsed.alignments, "left"];
    const newRows = parsed.rows.map((row) => [...row, ""]);
    updateTable({
      headers: newHeaders,
      alignments: newAlignments,
      rows: newRows,
    });
    focusCell("header", newColNum - 1);
  };

  const deleteColumn = (colIndex: number) => {
    if (parsed.headers.length <= 1) return;
    const newHeaders = parsed.headers.filter((_, idx) => idx !== colIndex);
    const newAlignments = parsed.alignments.filter((_, idx) => idx !== colIndex);
    const newRows = parsed.rows.map((row) =>
      row.filter((_, idx) => idx !== colIndex),
    );
    updateTable({
      headers: newHeaders,
      alignments: newAlignments,
      rows: newRows,
    });
  };

  const handleGridKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number | "header",
    colIndex: number,
  ) => {
    if (e.nativeEvent.isComposing) return;

    const input = e.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd =
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length;

    if (e.key === "Enter") {
      e.preventDefault();
      if (rowIndex === "header") {
        focusCell(0, colIndex);
      } else if (rowIndex === parsed.rows.length - 1) {
        addRow(colIndex);
      } else {
        focusCell(rowIndex + 1, colIndex);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowIndex === "header") {
        focusCell(0, colIndex);
      } else if (rowIndex < parsed.rows.length - 1) {
        focusCell(rowIndex + 1, colIndex);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIndex === 0) {
        focusCell("header", colIndex);
      } else if (typeof rowIndex === "number" && rowIndex > 0) {
        focusCell(rowIndex - 1, colIndex);
      }
      return;
    }

    if (e.key === "ArrowLeft" && atStart && colIndex > 0) {
      e.preventDefault();
      focusCell(rowIndex, colIndex - 1);
      return;
    }

    if (
      e.key === "ArrowRight" &&
      atEnd &&
      colIndex < parsed.headers.length - 1
    ) {
      e.preventDefault();
      focusCell(rowIndex, colIndex + 1);
    }
  };

  // Intercept multi-cell paste directly inside grid cells (Google Sheets / Excel / Markdown)
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRow: number | "header",
    startCol: number,
  ) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const isMultiLine = /\r?\n/.test(text.trim());
    const isTabDelimited = text.includes("\t");
    const isMarkdownBlock = isMultiLine && text.includes("|");

    if (!isMultiLine && !isTabDelimited && !isMarkdownBlock) {
      return; // Normal single-cell paste
    }

    e.preventDefault();
    const undoSnapshot: ParsedTable = {
      headers: [...parsed.headers],
      alignments: [...parsed.alignments],
      rows: parsed.rows.map((r) => [...r]),
    };

    // If pasting Markdown table or into empty placeholder grid, replace full table
    if (isMarkdownBlock || (startRow === "header" && startCol === 0) || isPlaceholderTable(parsed)) {
      const next = parseTableData(text);
      updateTable(next);
      setPasteToast({
        message: `Pasted ${next.rows.length} rows × ${next.headers.length} columns`,
        undoState: undoSnapshot,
      });
      return;
    }

    // Splice 2D range from TSV starting at (startRow, startCol)
    const rawLines = text
      .trim()
      .split(/\r?\n/)
      .filter((l) => l.length > 0);
    const matrix = rawLines.map((line) =>
      line.split(text.includes("\t") ? "\t" : ",").map((cell) => cell.trim()),
    );

    const maxRowCount = matrix.length;
    const maxColSpan = Math.max(...matrix.map((r) => r.length));
    const neededCols = startCol + maxColSpan;

    const nextHeaders = [...parsed.headers];
    const nextAlignments = [...parsed.alignments];
    while (nextHeaders.length < neededCols) {
      nextHeaders.push(`Column ${nextHeaders.length + 1}`);
      nextAlignments.push("left");
    }

    const baseRowIdx = startRow === "header" ? 0 : startRow;
    const neededRows = Math.max(parsed.rows.length, baseRowIdx + maxRowCount);
    const nextRows = parsed.rows.map((r) => {
      const padded = [...r];
      while (padded.length < neededCols) padded.push("");
      return padded;
    });
    while (nextRows.length < neededRows) {
      nextRows.push(new Array(neededCols).fill(""));
    }

    matrix.forEach((pastedRow, rOffset) => {
      pastedRow.forEach((cellVal, cOffset) => {
        if (startRow === "header" && rOffset === 0) {
          nextHeaders[startCol + cOffset] = cellVal;
        } else {
          const targetRow =
            startRow === "header" ? rOffset - 1 : baseRowIdx + rOffset;
          if (targetRow >= 0 && targetRow < nextRows.length) {
            nextRows[targetRow][startCol + cOffset] = cellVal;
          }
        }
      });
    });

    updateTable({
      headers: nextHeaders,
      alignments: nextAlignments,
      rows: nextRows,
    });
    setPasteToast({
      message: `Pasted ${maxRowCount} × ${maxColSpan} range into grid`,
      undoState: undoSnapshot,
    });
  };

  const handleImportApply = () => {
    if (!pasteBuffer.trim()) return;
    const next = parseTableData(pasteBuffer);
    updateTable(next);
    setPasteBuffer("");
    setPasteOpen(false);
    setActiveTab("grid");
  };

  const handleCopyMarkdown = () => {
    const md = serializeToMarkdown(parsed);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sibling = (getSiblingData(path) || {}) as {
    title?: string;
    caption?: string;
  };

  return (
    <div ref={containerRef} className="w-full space-y-1.5">
      {/* Native Payload-Matched Field Label Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-[13px] font-normal text-foreground">
          Table Data <span className="text-red-500">*</span>
        </label>
        <span className="text-[12px] font-normal text-foreground/60">
          {parsed.rows.length} {parsed.rows.length === 1 ? "row" : "rows"} ·{" "}
          {parsed.headers.length} cols
        </span>
      </div>

      {/* Main Editor Container */}
      <div className="w-full overflow-hidden rounded-[8px] border border-foreground/15 bg-white text-foreground dark:bg-[#1e1a17]">
        {/* Toolbar Strip */}
        <div className="cms-editor-reset flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 bg-foreground/[0.03] px-3 py-2">
          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            aria-label="Table editor modes"
            className="inline-flex items-center gap-0.5 rounded-[6px] bg-foreground/[0.06] p-[3px]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "grid"}
              onClick={() => setActiveTab("grid")}
              className={`flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-normal transition-colors ${
                activeTab === "grid"
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#2c2622]"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "raw"}
              onClick={() => setActiveTab("raw")}
              className={`flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-normal transition-colors ${
                activeTab === "raw"
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#2c2622]"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <CodeIcon className="h-3.5 w-3.5" />
              Markdown
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "preview"}
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-normal transition-colors ${
                activeTab === "preview"
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#2c2622]"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <EyeIcon className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          {/* Utility Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-expanded={pasteOpen}
              onClick={() => setPasteOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1.5 text-[12px] font-normal transition-colors ${
                pasteOpen
                  ? "border-foreground bg-foreground text-white dark:text-[#181411]"
                  : "border-foreground/15 bg-white text-foreground/70 hover:border-foreground/40 hover:text-foreground dark:bg-[#1e1a17]"
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste / Import
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 rounded-[6px] border border-foreground/15 bg-white px-2.5 py-1.5 text-[12px] font-normal text-foreground/70 transition-colors hover:border-foreground/40 hover:text-foreground dark:bg-[#1e1a17]"
              title="Copy Markdown table to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-foreground">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Quick Import Panel */}
        {pasteOpen && (
          <div className="cms-editor-reset border-b border-foreground/10 bg-foreground/[0.02] p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-normal text-foreground">
                Paste from Google Sheets, Excel, CSV, or Markdown
              </span>
              <span className="text-[11.5px] text-foreground/60">
                Or press Ctrl+V directly inside any cell below.
              </span>
            </div>
            <textarea
              rows={4}
              value={pasteBuffer}
              onChange={(e) => setPasteBuffer(e.target.value)}
              placeholder="| Header 1 | Header 2 |&#10;|---|---|&#10;| Value A | Value B |"
              className="w-full rounded-[6px] border border-foreground/15 bg-white p-2.5 font-mono text-[12px] text-foreground focus:border-foreground dark:bg-[#181411]"
            />
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="rounded-[6px] border border-foreground/15 bg-white px-3 py-1.5 text-[12px] font-normal text-foreground/70 hover:text-foreground dark:bg-[#1e1a17]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pasteBuffer.trim()}
                onClick={handleImportApply}
                className="rounded-[6px] bg-foreground px-3.5 py-1.5 text-[12px] font-normal text-white hover:opacity-90 disabled:opacity-40 dark:text-[#181411]"
              >
                Replace Table
              </button>
            </div>
          </div>
        )}

        {/* Undo Toast after Direct Grid Paste */}
        {pasteToast && (
          <div
            role="status"
            className="cms-editor-reset flex items-center justify-between gap-2 border-b border-foreground/10 bg-foreground/[0.04] px-3 py-1.5 text-[12px] text-foreground"
          >
            <span>{pasteToast.message}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updateTable(pasteToast.undoState);
                  setPasteToast(null);
                }}
                className="inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-foreground hover:bg-foreground/10"
              >
                <Undo2 className="h-3 w-3" />
                Undo
              </button>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setPasteToast(null)}
                className="rounded-[4px] p-0.5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: SEAMLESS SPREADSHEET GRID */}
        {activeTab === "grid" && (
          <div className="cms-editor-reset">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-foreground/10 bg-foreground/[0.025]">
                    <th className="w-10 border-r border-foreground/10 py-2.5 text-center font-mono text-[11px] font-normal text-foreground/50 select-none">
                      #
                    </th>

                    {parsed.headers.map((header, colIdx) => {
                      const align = parsed.alignments[colIdx] || "left";
                      return (
                        <th
                          key={colIdx}
                          className="group/col min-w-[140px] border-r border-foreground/10 p-0 text-left font-normal transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
                        >
                          <div className="flex items-center">
                            <input
                              type="text"
                              size={1}
                              data-tcell={`header-${colIdx}`}
                              value={header}
                              onChange={(e) =>
                                handleHeaderChange(colIdx, e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleGridKeyDown(e, "header", colIdx)
                              }
                              onPaste={(e) =>
                                handleCellPaste(e, "header", colIdx)
                              }
                              placeholder={`Column ${colIdx + 1}`}
                              className="min-w-0 flex-1 px-3 py-2.5 text-[12.5px] font-normal text-foreground/70 focus:text-foreground placeholder:text-foreground/30"
                            />

                            <div className="flex shrink-0 items-center gap-0.5 pr-1.5">
                              <button
                                type="button"
                                onClick={() => toggleAlignment(colIdx)}
                                title={`Column alignment: ${align} (click to cycle)`}
                                aria-label={`Cycle alignment for column ${header || colIdx + 1}, currently ${align}`}
                                className={`flex h-6 w-6 items-center justify-center rounded-[4px] transition-colors hover:bg-foreground/10 ${
                                  align !== "left"
                                    ? "text-foreground"
                                    : "text-foreground/45 hover:text-foreground"
                                }`}
                              >
                                {align === "left" && (
                                  <AlignLeft className="h-3.5 w-3.5" />
                                )}
                                {align === "center" && (
                                  <AlignCenter className="h-3.5 w-3.5" />
                                )}
                                {align === "right" && (
                                  <AlignRight className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {parsed.headers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => deleteColumn(colIdx)}
                                  title="Delete column"
                                  aria-label={`Delete column ${header || colIdx + 1}`}
                                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-foreground/45 opacity-0 transition-opacity group-focus-within/col:opacity-100 group-hover/col:opacity-100 hover:bg-red-500/10 hover:text-red-600 [@media(hover:none)]:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}

                    <th className="w-10 p-0 text-center font-normal">
                      <button
                        type="button"
                        onClick={addColumn}
                        title="Add column"
                        aria-label="Add column"
                        className="flex h-[38px] w-full items-center justify-center text-foreground/50 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {parsed.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="group/row border-b border-foreground/10 transition-colors last:border-b-0 hover:bg-foreground/[0.02]"
                    >
                      <td className="w-10 border-r border-foreground/10 bg-foreground/[0.02] text-center font-mono text-[11px] text-foreground/45 select-none">
                        {rowIdx + 1}
                      </td>

                      {parsed.headers.map((_, colIdx) => {
                        const align = parsed.alignments[colIdx] || "left";
                        return (
                          <td
                            key={colIdx}
                            className="border-r border-foreground/10 p-0 transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
                          >
                            <input
                              type="text"
                              size={1}
                              data-tcell={`${rowIdx}-${colIdx}`}
                              value={row[colIdx] || ""}
                              onChange={(e) =>
                                handleCellChange(rowIdx, colIdx, e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleGridKeyDown(e, rowIdx, colIdx)
                              }
                              onPaste={(e) =>
                                handleCellPaste(e, rowIdx, colIdx)
                              }
                              placeholder="—"
                              className={`min-h-[38px] w-full px-3 py-2 text-[13px] font-normal text-foreground placeholder:text-foreground/30 ${
                                align === "center"
                                  ? "text-center"
                                  : align === "right"
                                    ? "text-right"
                                    : "text-left"
                              }`}
                            />
                          </td>
                        );
                      })}

                      <td className="w-10 p-0 text-center">
                        <button
                          type="button"
                          onClick={() => deleteRow(rowIdx)}
                          title="Delete row"
                          aria-label={`Delete row ${rowIdx + 1}`}
                          className="mx-auto flex h-7 w-7 items-center justify-center rounded-[4px] text-foreground/45 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 hover:bg-red-500/10 hover:text-red-600 [@media(hover:none)]:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clean Full-Width Add Row Footer */}
            <button
              type="button"
              onClick={() => addRow(0)}
              className="flex w-full items-center justify-between border-t border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-[12.5px] font-normal text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add row
              </span>
              <span className="text-[11.5px] text-foreground/45">
                Arrow keys · Enter on last row
              </span>
            </button>
          </div>
        )}

        {/* TAB 2: MARKDOWN / TSV SOURCE */}
        {activeTab === "raw" && (
          <div className="cms-editor-reset">
            <textarea
              rows={10}
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              spellCheck={false}
              className="min-h-[240px] w-full resize-y bg-white p-4 font-mono text-[12.5px] leading-relaxed text-foreground dark:bg-[#1e1a17]"
              placeholder="| Col 1 | Col 2 | Col 3 |&#10;|---|---|---|&#10;| Val 1 | Val 2 | Val 3 |"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-[12px] text-foreground/60">
              <span>
                Supports Markdown pipes, tab-separated (TSV), or CSV syntax.
              </span>
              <button
                type="button"
                onClick={() => handleRawChange(serializeToMarkdown(parsed))}
                className="rounded-[4px] px-2.5 py-1 text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                Format &amp; Align Columns
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE FRONTEND PREVIEW */}
        {activeTab === "preview" && (
          <div className="bg-background p-5">
            <BlockTable
              title={sibling.title}
              caption={sibling.caption}
              tableData={rawText}
            />
          </div>
        )}
      </div>
    </div>
  );
}
