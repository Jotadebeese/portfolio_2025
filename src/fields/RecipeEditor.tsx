"use client";

import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useForm, useAllFormFields } from "@payloadcms/ui";
import {
  Table as TableIcon,
  ClipboardPaste,
  Eye,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Calculator,
  Check,
  FileText,
  Undo2,
  X,
} from "lucide-react";
import RecipeScaler, {
  IngredientItem,
  IngredientSection,
} from "@/components/recipes/recipe-scaler";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return (
    Math.random().toString(16).slice(2, 14) +
    Math.random().toString(16).slice(2, 14)
  );
}

function stripMarkdownBold(text: string): string {
  return text.replace(/^\*\*(.*)\*\*$/, "$1").trim();
}

function parseNumericValue(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/%$/, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : num;
}

function parseAmountAndUnit(token: string): { amount: number; unit: string } | null {
  const clean = token.replace(/,/g, "").trim();
  const match = clean.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Zµμ]+)?$/);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  if (isNaN(amount)) return null;
  return { amount, unit: match[2] || "" };
}

function isIgnorableTableMetaRow(cells: string[]): boolean {
  const first = (cells[0] || "").toLowerCase().trim();
  const second = (cells[1] || "").toLowerCase().trim();

  if (
    (first === "#" && second.includes("ingredient")) ||
    (first.includes("ingredient") &&
      (second.includes("amount") ||
        second.includes("proportion") ||
        second.includes("weight") ||
        second.includes("baker")))
  ) {
    return true;
  }

  if (
    /^(subtotal\s*[—–-]|grand total|total stuffed weight|estimated total)/i.test(
      first,
    ) ||
    /^(subtotal\s*[—–-]|grand total|total stuffed weight|estimated total)/i.test(
      second,
    )
  ) {
    return true;
  }

  return false;
}

function parseDelimitedCells(parts: string[]): IngredientItem | null {
  if (parts.length < 2) return null;
  if (isIgnorableTableMetaRow(parts)) return null;

  // Strip leading row index `#` if column 0 is an integer and column 1 is a name
  let cols = [...parts];
  if (
    cols.length >= 4 &&
    /^\d+$/.test(cols[0]) &&
    cols[1] &&
    isNaN(Number(cols[1].replace(/,/g, "")))
  ) {
    cols = cols.slice(1);
  }

  // Case 1: Percent-first markdown/spreadsheet table: | Name | 75% | 750 g | Notes |
  if (cols[1]?.includes("%") || /^\s*—\s*$/.test(cols[1] || "")) {
    const name = stripMarkdownBold(cols[0] || "");
    if (!name) return null;
    const pctVal = parseNumericValue(cols[1] || "");
    const amtUnit = parseAmountAndUnit(cols[2] || "");
    return {
      id: generateId(),
      name,
      amount: amtUnit ? amtUnit.amount : 0,
      unit: amtUnit?.unit || "g",
      percentage: !isNaN(pctVal) ? pctVal : null,
      notes: cols.slice(3).filter(Boolean).join(" — "),
    };
  }

  // Case 2: Amount-first spreadsheet: Amount \t Unit \t Name \t % \t Notes
  const firstIsAmount = /^[0-9][0-9,]*(?:\.[0-9]+)?$/.test(cols[0] || "");
  if (firstIsAmount && cols.length >= 3 && isNaN(Number(cols[2]))) {
    const amount = parseNumericValue(cols[0]);
    const unit = cols[1] || "g";
    const name = stripMarkdownBold(cols[2] || "Ingredient");
    const pctVal = cols[3] ? parseNumericValue(cols[3]) : NaN;
    const notes = cols.slice(4).filter(Boolean).join(" — ");
    return {
      id: generateId(),
      name,
      amount: isNaN(amount) ? 0 : amount,
      unit,
      percentage: !isNaN(pctVal) ? pctVal : null,
      notes,
    };
  }

  // Case 3: Name \t Amount+Unit \t % \t Notes  OR  Name \t Amount \t Unit \t % \t Notes
  const name = stripMarkdownBold(cols[0] || "");
  if (!name) return null;

  const col1AsPureNum = /^[0-9][0-9,]*(?:\.[0-9]+)?$/.test(cols[1] || "");
  const col1WithUnit = parseAmountAndUnit(cols[1] || "");

  if (col1WithUnit && !col1AsPureNum && col1WithUnit.unit) {
    const pctVal = cols[2] ? parseNumericValue(cols[2]) : NaN;
    const notes = cols.slice(3).filter(Boolean).join(" — ");
    return {
      id: generateId(),
      name,
      amount: col1WithUnit.amount,
      unit: col1WithUnit.unit,
      percentage: !isNaN(pctVal) ? pctVal : null,
      notes,
    };
  }

  const amount = parseNumericValue(cols[1] || "");
  const unit = cols[2] && !cols[2].includes("%") ? cols[2] : "g";
  const pctCol = cols[2]?.includes("%") ? cols[2] : cols[3] || "";
  const pctVal = pctCol ? parseNumericValue(pctCol) : NaN;
  const noteStartIdx = cols[2]?.includes("%") ? 3 : 4;
  const notes = cols.slice(noteStartIdx).filter(Boolean).join(" — ");

  return {
    id: generateId(),
    name,
    amount: isNaN(amount) ? 0 : amount,
    unit,
    percentage: !isNaN(pctVal) ? pctVal : null,
    notes,
  };
}

function parseIngredientLine(line: string): IngredientItem | null {
  const trimmed = line.trim();
  if (
    !trimmed ||
    trimmed.startsWith("---") ||
    /^\|?[\s:\-|]+\|?$/.test(trimmed)
  ) {
    return null;
  }

  // 1. Markdown pipe table row
  if (trimmed.includes("|")) {
    const parts = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((s) => s.trim());
    return parseDelimitedCells(parts);
  }

  // 2. Tab-delimited (Google Sheets / Excel copy)
  if (trimmed.includes("\t")) {
    const parts = trimmed.split("\t").map((s) => s.trim());
    return parseDelimitedCells(parts);
  }

  // 3. Natural recipe line: "750g Lean Pork (75%) - Hand-diced"
  const naturalMatch = trimmed.match(
    /^([0-9][0-9,]*(?:\.[0-9]+)?)\s*([a-zA-Zµμ]+)?\s+(.+?)(?:\s*\(([^)]+)\))?(?:\s*[-–—:]\s*(.*))?$/,
  );
  if (naturalMatch) {
    const amount = parseNumericValue(naturalMatch[1]) || 0;
    const unit = naturalMatch[2] || "g";
    const name = stripMarkdownBold(naturalMatch[3].trim());
    let percentage: number | null = null;
    let notes = naturalMatch[5]?.trim() || "";

    if (naturalMatch[4]) {
      const paren = naturalMatch[4].trim();
      if (paren.includes("%")) {
        const pct = parseNumericValue(paren);
        percentage = !isNaN(pct) ? pct : null;
      } else if (!notes) {
        notes = paren;
      }
    }
    return { id: generateId(), name, amount, unit, percentage, notes };
  }

  return {
    id: generateId(),
    name: stripMarkdownBold(trimmed),
    amount: 0,
    unit: "g",
    percentage: null,
    notes: "",
  };
}

function parseRecipeText(text: string): IngredientSection[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const sections: IngredientSection[] = [];
  let currentSection: IngredientSection = {
    id: generateId(),
    sectionName: "Ingredients",
    ingredients: [],
  };

  for (const line of lines) {
    if (line.startsWith("---") || /^\|?[\s:\-|]+\|?$/.test(line)) continue;

    // Detect section headers: "## Meat Base", "[Meat Base]", "1. MEAT BASE", "Meat Base:"
    const numberedSectionMatch =
      !line.includes("|") &&
      !line.includes("\t") &&
      /^\d+\.\s+[A-Z0-9\s&/()-]+$/.test(line);

    const isHeader =
      line.startsWith("#") ||
      line.startsWith("===") ||
      /^\[.+\]$/.test(line) ||
      /^section[:\s]/i.test(line) ||
      numberedSectionMatch ||
      (line.endsWith(":") &&
        !line.includes("\t") &&
        !line.includes(",") &&
        !line.includes("|") &&
        !/^[0-9]/.test(line));

    if (isHeader) {
      const cleanName = line
        .replace(/^#+\s*/, "")
        .replace(/^\[|\]$/g, "")
        .replace(/^section[:\s]+/i, "")
        .replace(/:$/, "")
        .trim();

      if (currentSection.ingredients.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        id: generateId(),
        sectionName: cleanName || "Section",
        ingredients: [],
      };
      continue;
    }

    const ing = parseIngredientLine(line);
    if (ing && ing.name) {
      currentSection.ingredients.push(ing);
    }
  }

  if (currentSection.ingredients.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

function mergeSectionRows(
  rows: Array<{ id?: string | null }>,
  existingRows: any[] | undefined,
) {
  const byId = new Map<string, any>();
  if (Array.isArray(existingRows)) {
    for (const row of existingRows) {
      if (row && typeof row === "object" && row.id) {
        byId.set(String(row.id), row);
      }
    }
  }
  return rows.map((item) => {
    const rowId = item.id ? String(item.id) : undefined;
    const prevRow = rowId ? byId.get(rowId) : undefined;
    return {
      ...(prevRow && typeof prevRow === "object" ? prevRow : {}),
      ...(rowId ? { id: rowId } : {}),
      collapsed: prevRow?.collapsed ?? false,
      isLoading: false,
    };
  });
}

function sectionsToFields(
  basePath: string,
  sections: IngredientSection[],
  existingFields?: Record<string, any>,
): Record<string, any> {
  const fields: Record<string, any> = {};
  const existingBase = existingFields?.[basePath];

  // Index prior field paths by row id so edits, additions, removals, and reorders
  // keep Payload field metadata (customComponents, validate, initialValue, lastRenderedPath).
  const oldSectionPathById = new Map<string, string>();
  const oldIngredientPathById = new Map<string, string>();
  if (existingFields) {
    const idPrefix = `${basePath}.`;
    for (const [key, fieldState] of Object.entries(existingFields)) {
      if (!key.startsWith(idPrefix) || !key.endsWith(".id")) continue;
      const idVal =
        typeof fieldState?.value === "string" && fieldState.value
          ? fieldState.value
          : null;
      if (!idVal) continue;
      const parts = key.slice(idPrefix.length).split(".");
      if (parts.length === 2) {
        oldSectionPathById.set(idVal, `${basePath}.${parts[0]}`);
      } else if (parts.length === 4 && parts[1] === "ingredients") {
        oldIngredientPathById.set(
          idVal,
          `${basePath}.${parts[0]}.ingredients.${parts[2]}`,
        );
      }
    }
  }

  const omitErrorProps = (fieldState: any) => {
    const clean = { ...fieldState };
    delete clean.errorMessage;
    delete clean.errorPaths;
    return clean;
  };

  const mergeArrayField = (
    prevField: any,
    rows: Array<{ id?: string | null }>,
  ) => {
    const base =
      prevField && typeof prevField === "object"
        ? omitErrorProps(prevField)
        : { initialValue: rows.length };
    return {
      ...base,
      value: rows.length,
      rows: mergeSectionRows(rows, prevField?.rows),
      disableFormData: rows.length > 0,
      valid: true,
      passesCondition: prevField?.passesCondition !== false,
      ...(Array.isArray(prevField?.errorPaths) ? { errorPaths: [] } : {}),
    };
  };

  const mergeLeafField = (oldKey: string | undefined, value: any) => {
    const prev = oldKey ? existingFields?.[oldKey] : undefined;
    if (prev && typeof prev === "object") {
      return {
        ...omitErrorProps(prev),
        value,
        valid: true,
        passesCondition: prev.passesCondition !== false,
        ...(prev.value !== value ? { isModified: true } : {}),
      };
    }
    return {
      initialValue: value,
      passesCondition: true,
      value,
      valid: true,
    };
  };

  fields[basePath] = mergeArrayField(existingBase, sections);

  sections.forEach((sec, sIdx) => {
    const sPath = `${basePath}.${sIdx}`;
    const oldSPath = sec.id ? oldSectionPathById.get(String(sec.id)) : undefined;

    fields[`${sPath}.id`] = mergeLeafField(
      oldSPath ? `${oldSPath}.id` : undefined,
      sec.id,
    );
    fields[`${sPath}.sectionName`] = mergeLeafField(
      oldSPath ? `${oldSPath}.sectionName` : undefined,
      sec.sectionName || "Section",
    );

    const ingredients = sec.ingredients || [];
    const prevIngArray = oldSPath
      ? existingFields?.[`${oldSPath}.ingredients`]
      : undefined;

    fields[`${sPath}.ingredients`] = mergeArrayField(prevIngArray, ingredients);

    ingredients.forEach((ing, iIdx) => {
      const iPath = `${sPath}.ingredients.${iIdx}`;
      const oldIPath = ing.id
        ? oldIngredientPathById.get(String(ing.id))
        : undefined;

      fields[`${iPath}.id`] = mergeLeafField(
        oldIPath ? `${oldIPath}.id` : undefined,
        ing.id,
      );
      fields[`${iPath}.name`] = mergeLeafField(
        oldIPath ? `${oldIPath}.name` : undefined,
        ing.name || "",
      );

      const parsedAmount =
        typeof ing.amount === "number"
          ? Number.isFinite(ing.amount)
            ? ing.amount
            : 0
          : parseFloat(String(ing.amount)) || 0;
      fields[`${iPath}.amount`] = mergeLeafField(
        oldIPath ? `${oldIPath}.amount` : undefined,
        parsedAmount,
      );

      fields[`${iPath}.unit`] = mergeLeafField(
        oldIPath ? `${oldIPath}.unit` : undefined,
        ing.unit || "g",
      );

      const hasPct =
        ing.percentage !== undefined &&
        ing.percentage !== null &&
        String(ing.percentage).trim() !== "";
      const rawPct = hasPct
        ? typeof ing.percentage === "number"
          ? ing.percentage
          : parseFloat(String(ing.percentage))
        : null;
      const parsedPct =
        rawPct !== null && Number.isFinite(rawPct) ? rawPct : null;
      fields[`${iPath}.percentage`] = mergeLeafField(
        oldIPath ? `${oldIPath}.percentage` : undefined,
        parsedPct,
      );

      const parsedNotes =
        ing.notes && String(ing.notes).trim() !== ""
          ? String(ing.notes)
          : null;
      fields[`${iPath}.notes`] = mergeLeafField(
        oldIPath ? `${oldIPath}.notes` : undefined,
        parsedNotes,
      );
    });
  });

  return fields;
}

const COMMON_UNITS = [
  "g",
  "ml",
  "kg",
  "m",
  "tsp",
  "tbsp",
  "pcs",
  "cups",
  "cloves",
  "drops",
];

// Clean decimal cell input that never eats intermediate typing states like "0." or ""
interface DecimalCellProps {
  value: number | null | undefined;
  allowEmpty?: boolean;
  placeholder?: string;
  dataCell: string;
  className?: string;
  onCommit: (next: number | null) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function DecimalCell({
  value,
  allowEmpty = false,
  placeholder = "0",
  dataCell,
  className = "",
  onCommit,
  onKeyDown,
}: DecimalCellProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(
    value !== undefined && value !== null ? String(value) : "",
  );

  useEffect(() => {
    if (!focused) {
      setDraft(value !== undefined && value !== null ? String(value) : "");
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);

    if (raw.trim() === "") {
      onCommit(allowEmpty ? null : 0);
      return;
    }

    // Keep typing smooth while ending in decimal point
    if (raw.endsWith(".")) return;

    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onCommit(num);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (draft.trim() === "") {
      onCommit(allowEmpty ? null : 0);
      setDraft(allowEmpty ? "" : "0");
      return;
    }
    const num = parseFloat(draft);
    if (isNaN(num)) {
      onCommit(allowEmpty ? null : 0);
      setDraft(allowEmpty ? "" : "0");
    } else {
      onCommit(num);
      setDraft(String(num));
    }
  };

  return (
    <input
      type="text"
      size={1}
      inputMode="decimal"
      data-rcell={dataCell}
      value={draft}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}

function createEmptyIngredient(): IngredientItem {
  return {
    id: generateId(),
    name: "",
    amount: 0,
    unit: "g",
    percentage: null,
    notes: "",
  };
}

function normalizeSections(rawSections: any[]): IngredientSection[] {
  return rawSections.map((sec: any) => ({
    id: sec.id || generateId(),
    sectionName: sec.sectionName || "Section",
    ingredients: Array.isArray(sec.ingredients)
      ? sec.ingredients.map((ing: any) => ({
          id: ing.id || generateId(),
          name: ing.name || "",
          amount:
            typeof ing.amount === "number"
              ? ing.amount
              : parseFloat(ing.amount) || 0,
          unit: ing.unit || "g",
          percentage:
            ing.percentage !== undefined &&
            ing.percentage !== null &&
            String(ing.percentage).trim() !== ""
              ? parseFloat(String(ing.percentage))
              : null,
          notes: ing.notes || "",
        }))
      : [createEmptyIngredient()],
  }));
}

type CellColumn = "name" | "amount" | "unit" | "pct" | "notes";
const CELL_COLUMNS: CellColumn[] = ["name", "amount", "unit", "pct", "notes"];

export default function RecipeEditor({ path }: { path: string }) {
  const { getDataByPath, getSiblingData, setModified } = useForm();
  const [allFields, dispatchFields] = useAllFormFields();
  const unitsListId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<
    "grid" | "paste" | "export" | "preview"
  >("grid");

  const [sections, setSections] = useState<IngredientSection[]>(() => {
    const initial = getDataByPath(path);
    if (Array.isArray(initial) && initial.length > 0) {
      return normalizeSections(initial);
    }
    return [
      {
        id: generateId(),
        sectionName: "Meat & Fat Base",
        ingredients: [
          {
            id: generateId(),
            name: "",
            amount: 750,
            unit: "g",
            percentage: 75,
            notes: "",
          },
        ],
      },
    ];
  });

  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    const existing = getDataByPath(path);
    if (Array.isArray(existing) && existing.length > 0) {
      setSections((prev) => {
        const isPlaceholder =
          prev.length === 1 &&
          prev[0].sectionName === "Meat & Fat Base" &&
          prev[0].ingredients.length === 1 &&
          !prev[0].ingredients[0].name;
        if (isPlaceholder) {
          return normalizeSections(existing);
        }
        return prev;
      });
      hasHydratedRef.current = true;
    }
  }, [getDataByPath, path]);

  const [pasteText, setPasteText] = useState("");
  const [pasteTargetSection, setPasteTargetSection] = useState<number>(0);
  const [pasteMode, setPasteMode] = useState<
    "append" | "replace" | "new_section" | "all"
  >("append");
  const [copiedNotification, setCopiedNotification] = useState<string | null>(
    null,
  );
  const [pasteToast, setPasteToast] = useState<{
    message: string;
    undoState: IngredientSection[];
  } | null>(null);

  const allFieldsRef = useRef(allFields);
  allFieldsRef.current = allFields;

  const syncToFormState = useCallback(
    (newSections: IngredientSection[]) => {
      setSections(newSections);

      const currentFields = allFieldsRef.current || {};
      const remainingFields: Record<string, any> = {};
      const prefix = `${path}.`;
      for (const [key, val] of Object.entries(currentFields)) {
        if (!key.startsWith(prefix)) {
          remainingFields[key] = val;
        }
      }

      const updatedSectionFields = sectionsToFields(
        path,
        newSections,
        currentFields,
      );
      const nextState = {
        ...remainingFields,
        ...updatedSectionFields,
      };
      allFieldsRef.current = nextState;

      if (typeof dispatchFields === "function") {
        dispatchFields({
          type: "REPLACE_STATE",
          state: nextState,
          optimize: false,
          sanitize: true,
        });
      }

      if (typeof setModified === "function") {
        setModified(true);
      }
    },
    [path, dispatchFields, setModified],
  );

  const focusCell = useCallback(
    (secIdx: number, ingIdx: number, col: CellColumn) => {
      requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector<HTMLInputElement>(
          `input[data-rcell="${secIdx}-${ingIdx}-${col}"]`,
        );
        el?.focus();
      });
    },
    [],
  );

  // Section handlers
  const handleAddSection = () => {
    const nextIdx = sections.length;
    const newSection: IngredientSection = {
      id: generateId(),
      sectionName: `Section ${nextIdx + 1}`,
      ingredients: [createEmptyIngredient()],
    };
    syncToFormState([...sections, newSection]);
    focusCell(nextIdx, 0, "name");
  };

  const handleDeleteSection = (secIndex: number) => {
    if (sections.length <= 1) return;
    syncToFormState(sections.filter((_, idx) => idx !== secIndex));
  };

  const handleMoveSection = (secIndex: number, direction: "up" | "down") => {
    const target = direction === "up" ? secIndex - 1 : secIndex + 1;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(secIndex, 1);
    next.splice(target, 0, moved);
    syncToFormState(next);
  };

  const handleUpdateSectionName = (secIndex: number, name: string) => {
    const next = [...sections];
    next[secIndex] = { ...next[secIndex], sectionName: name };
    syncToFormState(next);
  };

  // Ingredient handlers
  const handleAddIngredient = (secIndex: number, afterIndex?: number) => {
    const next = [...sections];
    const ingredients = [...(next[secIndex].ingredients || [])];
    const newRow = createEmptyIngredient();
    const targetIdx =
      typeof afterIndex === "number" ? afterIndex + 1 : ingredients.length;

    ingredients.splice(targetIdx, 0, newRow);
    next[secIndex] = { ...next[secIndex], ingredients };
    syncToFormState(next);
    focusCell(secIndex, targetIdx, "name");
  };

  const handleDeleteIngredient = (secIndex: number, ingIndex: number) => {
    const next = [...sections];
    const ingredients = next[secIndex].ingredients.filter(
      (_, idx) => idx !== ingIndex,
    );
    if (ingredients.length === 0) {
      ingredients.push(createEmptyIngredient());
    }
    next[secIndex] = { ...next[secIndex], ingredients };
    syncToFormState(next);
  };

  const handleMoveIngredient = (
    secIndex: number,
    ingIndex: number,
    direction: "up" | "down",
  ) => {
    const target = direction === "up" ? ingIndex - 1 : ingIndex + 1;
    const next = [...sections];
    const ingredients = [...next[secIndex].ingredients];
    if (target < 0 || target >= ingredients.length) return;
    const [moved] = ingredients.splice(ingIndex, 1);
    ingredients.splice(target, 0, moved);
    next[secIndex] = { ...next[secIndex], ingredients };
    syncToFormState(next);
  };

  const handleUpdateIngredient = (
    secIndex: number,
    ingIndex: number,
    field: keyof IngredientItem,
    val: any,
  ) => {
    const next = [...sections];
    const ingredients = [...next[secIndex].ingredients];
    ingredients[ingIndex] = {
      ...ingredients[ingIndex],
      [field]: val,
    };
    next[secIndex] = { ...next[secIndex], ingredients };
    syncToFormState(next);
  };

  const handleAutoCalculatePercentages = (secIndex?: number) => {
    const sibling = (getSiblingData(path) || {}) as Record<string, any>;
    const baseBatch = parseFloat(sibling.baseYield) || 1000;

    const next = sections.map((sec, sIdx) => {
      if (secIndex !== undefined && sIdx !== secIndex) return sec;
      const ingredients = sec.ingredients.map((ing) => {
        const amt =
          typeof ing.amount === "number"
            ? ing.amount
            : parseFloat(String(ing.amount)) || 0;
        const calcPct = Math.round((amt / baseBatch) * 10000) / 100;
        return {
          ...ing,
          percentage: calcPct > 0 ? calcPct : null,
        };
      });
      return { ...sec, ingredients };
    });

    syncToFormState(next);
  };

  // Spreadsheet arrow-key navigation + Enter to add row
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    secIdx: number,
    ingIdx: number,
    col: CellColumn,
  ) => {
    if (e.nativeEvent.isComposing) return;

    const section = sections[secIdx];
    const rowCount = section.ingredients.length;

    if (e.key === "Enter" && (col === "name" || col === "notes")) {
      e.preventDefault();
      handleAddIngredient(secIdx, ingIdx);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (ingIdx < rowCount - 1) {
        focusCell(secIdx, ingIdx + 1, col);
      } else if (secIdx < sections.length - 1) {
        focusCell(secIdx + 1, 0, col);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (ingIdx > 0) {
        focusCell(secIdx, ingIdx - 1, col);
      } else if (secIdx > 0) {
        const prevRows = sections[secIdx - 1].ingredients.length;
        focusCell(secIdx - 1, Math.max(0, prevRows - 1), col);
      }
      return;
    }

    const input = e.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd =
      input.selectionStart === input.value.length &&
      input.selectionEnd === input.value.length;
    const colIdx = CELL_COLUMNS.indexOf(col);

    if (e.key === "ArrowLeft" && atStart && colIdx > 0) {
      e.preventDefault();
      focusCell(secIdx, ingIdx, CELL_COLUMNS[colIdx - 1]);
      return;
    }

    if (e.key === "ArrowRight" && atEnd && colIdx < CELL_COLUMNS.length - 1) {
      e.preventDefault();
      focusCell(secIdx, ingIdx, CELL_COLUMNS[colIdx + 1]);
    }
  };

  // Direct multi-row paste inside any Ingredient Name cell
  const handleNamePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    secIdx: number,
    ingIdx: number,
  ) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    const hasTableStructure =
      /\r?\n/.test(text.trim()) || text.includes("\t") || text.includes("|");
    if (!hasTableStructure) return;

    const parsed = parseRecipeText(text);
    const flatItems = parsed.flatMap((s) => s.ingredients);
    if (flatItems.length === 0) return;

    e.preventDefault();
    const undoSnapshot = sections.map((s) => ({
      ...s,
      ingredients: s.ingredients.map((i) => ({ ...i })),
    }));

    const next = [...sections];
    const currentRows = [...next[secIdx].ingredients];
    const targetRow = currentRows[ingIdx];
    const replaceCurrentRow = !targetRow?.name?.trim() && targetRow?.amount === 0;

    if (replaceCurrentRow) {
      currentRows.splice(ingIdx, 1, ...flatItems);
    } else {
      currentRows.splice(ingIdx + 1, 0, ...flatItems);
    }

    next[secIdx] = { ...next[secIdx], ingredients: currentRows };
    syncToFormState(next);
    setPasteToast({
      message: `Pasted ${flatItems.length} ${flatItems.length === 1 ? "ingredient" : "ingredients"} into "${next[secIdx].sectionName}"`,
      undoState: undoSnapshot,
    });
  };

  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    const parsedSections = parseRecipeText(pasteText);
    if (parsedSections.length === 0) return;

    if (pasteMode === "all") {
      syncToFormState(parsedSections);
    } else if (pasteMode === "new_section") {
      const allNew = parsedSections.flatMap((s) => s.ingredients);
      const newSec: IngredientSection = {
        id: generateId(),
        sectionName:
          parsedSections[0]?.sectionName || `Section ${sections.length + 1}`,
        ingredients: allNew,
      };
      syncToFormState([...sections, newSec]);
    } else if (pasteMode === "replace") {
      const allNew = parsedSections.flatMap((s) => s.ingredients);
      const next = [...sections];
      next[pasteTargetSection] = {
        ...next[pasteTargetSection],
        ingredients: allNew,
      };
      syncToFormState(next);
    } else {
      const allNew = parsedSections.flatMap((s) => s.ingredients);
      const next = [...sections];
      next[pasteTargetSection] = {
        ...next[pasteTargetSection],
        ingredients: [...next[pasteTargetSection].ingredients, ...allNew],
      };
      syncToFormState(next);
    }

    setPasteText("");
    setActiveTab("grid");
  };

  const generateMarkdownTable = () => {
    return sections
      .map((sec) => {
        const header = `### ${sec.sectionName}\n\n| Ingredient | Amount | Unit | Baker's % | Notes |\n| :--- | :--- | :--- | :--- | :--- |`;
        const rows = sec.ingredients.map(
          (i) =>
            `| ${i.name} | ${i.amount} | ${i.unit} | ${
              i.percentage != null ? `${i.percentage}%` : "-"
            } | ${i.notes || "-"} |`,
        );
        return [header, ...rows].join("\n");
      })
      .join("\n\n");
  };

  const generateTSV = () => {
    return sections
      .map((sec) => {
        const title = `[${sec.sectionName}]`;
        const rows = sec.ingredients.map(
          (i) =>
            `${i.name}\t${i.amount}\t${i.unit}\t${
              i.percentage != null ? `${i.percentage}%` : ""
            }\t${i.notes || ""}`,
        );
        return [title, ...rows].join("\n");
      })
      .join("\n\n");
  };

  const handleCopyText = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  const sibling = (getSiblingData(path) || {}) as Record<string, any>;
  const baseYield = sibling.baseYield ? Number(sibling.baseYield) : 1000;
  const yieldUnit = sibling.yieldUnit || "g";

  const totalIngredients = sections.reduce(
    (acc, s) => acc + (s.ingredients?.length || 0),
    0,
  );
  const grandTotalWeight = sections.reduce(
    (acc, s) =>
      acc +
      (s.ingredients || []).reduce(
        (sum, i) => (i.unit === yieldUnit ? sum + (Number(i.amount) || 0) : sum),
        0,
      ),
    0,
  );
  const grandTotalPct = sections.reduce(
    (acc, s) =>
      acc +
      (s.ingredients || []).reduce(
        (sum, i) => sum + (Number(i.percentage) || 0),
        0,
      ),
    0,
  );

  return (
    <div ref={containerRef} className="w-full space-y-1.5">
      {/* Native Payload-Matched Outer Field Label & Live Telemetry */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-[13px] font-normal text-foreground">
          Ingredient Sections &amp; Formula{" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-normal text-foreground/60">
          <span>
            {sections.length} {sections.length === 1 ? "section" : "sections"} ·{" "}
            {totalIngredients}{" "}
            {totalIngredients === 1 ? "ingredient" : "ingredients"}
          </span>
          {grandTotalWeight > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-foreground tabular-nums">
                Total: {Math.round(grandTotalWeight * 10) / 10} {yieldUnit}
                {grandTotalPct > 0 && (
                  <span className="ml-1 text-foreground/60">
                    ({Math.round(grandTotalPct * 10) / 10}%)
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Single Clean Editor Container */}
      <div className="w-full overflow-hidden rounded-[8px] border border-foreground/15 bg-white text-foreground dark:bg-[#1e1a17]">
        {/* Top Toolbar */}
        <div className="cms-editor-reset flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 bg-foreground/[0.03] px-3 py-2">
          <div
            role="tablist"
            aria-label="Recipe editor modes"
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
              Editor
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "paste"}
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-normal transition-colors ${
                activeTab === "paste"
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#2c2622]"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Import
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "export"}
              onClick={() => setActiveTab("export")}
              className={`flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12px] font-normal transition-colors ${
                activeTab === "export"
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-[#2c2622]"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <Copy className="h-3.5 w-3.5" />
              Export
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
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          {activeTab === "grid" && (
            <button
              type="button"
              onClick={() => handleAutoCalculatePercentages()}
              title={`Recalculate Baker's % across all sections using Base Batch Size (${baseYield} ${yieldUnit})`}
              className="flex items-center gap-1.5 rounded-[6px] border border-foreground/15 bg-white px-2.5 py-1.5 text-[12px] font-normal text-foreground/70 transition-colors hover:border-foreground/40 hover:text-foreground dark:bg-[#1e1a17]"
            >
              <Calculator className="h-3.5 w-3.5" />
              Calc % ({baseYield} {yieldUnit})
            </button>
          )}
        </div>

        {/* Direct Grid Paste Toast */}
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
                  syncToFormState(pasteToast.undoState);
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

        {/* TAB 1: FLATTENED VISUAL FORMULA EDITOR */}
        {activeTab === "grid" && (
          <div className="cms-editor-reset">
            <datalist id={unitsListId}>
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>

            <div className="divide-y divide-foreground/15">
              {sections.map((section, secIdx) => {
                const sectionTotalWeight = section.ingredients.reduce(
                  (acc, i) =>
                    i.unit === yieldUnit ? acc + (Number(i.amount) || 0) : acc,
                  0,
                );
                const sectionTotalPct = section.ingredients.reduce(
                  (acc, i) => acc + (Number(i.percentage) || 0),
                  0,
                );

                return (
                  <section key={section.id || secIdx} className="w-full">
                    {/* Clean Section Band Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 bg-foreground/[0.025] px-3 py-2">
                      <div className="flex min-w-[180px] flex-1 items-center gap-2">
                        <span className="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-foreground/[0.07] px-1.5 py-0.5 font-mono text-[11px] font-normal text-foreground/70">
                          {String(secIdx + 1).padStart(2, "0")}
                        </span>
                        <input
                          type="text"
                          size={1}
                          value={section.sectionName}
                          onChange={(e) =>
                            handleUpdateSectionName(secIdx, e.target.value)
                          }
                          placeholder="Section title (e.g. Meat Base, Seasonings)"
                          aria-label={`Section ${secIdx + 1} title`}
                          className="min-w-0 flex-1 rounded-[4px] px-2 py-1 text-[13px] font-normal text-foreground transition-colors placeholder:text-foreground/30 hover:bg-foreground/[0.03] focus:bg-white focus:shadow-[inset_0_0_0_1.5px_var(--foreground)] dark:focus:bg-[#181411]"
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {(sectionTotalWeight > 0 || sectionTotalPct > 0) && (
                          <span className="mr-1 font-mono text-[11.5px] font-normal text-foreground/60 tabular-nums">
                            {sectionTotalWeight > 0 &&
                              `${Math.round(sectionTotalWeight * 10) / 10} ${yieldUnit}`}
                            {sectionTotalWeight > 0 && sectionTotalPct > 0 && " · "}
                            {sectionTotalPct > 0 &&
                              `${Math.round(sectionTotalPct * 10) / 10}%`}
                          </span>
                        )}

                        {sections.length > 1 && (
                          <>
                            <button
                              type="button"
                              disabled={secIdx === 0}
                              onClick={() => handleMoveSection(secIdx, "up")}
                              title="Move section up"
                              aria-label={`Move section ${section.sectionName} up`}
                              className="flex h-6 w-6 items-center justify-center rounded-[4px] text-foreground/55 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:text-foreground/20"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={secIdx === sections.length - 1}
                              onClick={() => handleMoveSection(secIdx, "down")}
                              title="Move section down"
                              aria-label={`Move section ${section.sectionName} down`}
                              className="flex h-6 w-6 items-center justify-center rounded-[4px] text-foreground/55 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:text-foreground/20"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(secIdx)}
                              title="Delete section"
                              aria-label={`Delete section ${section.sectionName}`}
                              className="flex h-6 w-6 items-center justify-center rounded-[4px] text-foreground/55 transition-colors hover:bg-red-500/10 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Seamless Edge-to-Edge Ingredient Table (Fixed Proportions, Zero Desktop Overflow) */}
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] table-fixed border-collapse text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-foreground/10 bg-white text-[10.5px] font-normal tracking-wider text-foreground/60 uppercase dark:bg-[#1e1a17]">
                            <th className="w-8 border-r border-foreground/10 py-2 text-center font-normal">
                              #
                            </th>
                            <th className="w-[26%] border-r border-foreground/10 px-2.5 py-2 font-normal">
                              Ingredient
                            </th>
                            <th className="w-[68px] border-r border-foreground/10 px-2.5 py-2 text-right font-normal">
                              Amount
                            </th>
                            <th className="w-[52px] border-r border-foreground/10 px-2 py-2 font-normal">
                              Unit
                            </th>
                            <th className="w-[82px] border-r border-foreground/10 px-2.5 py-2 text-right font-normal whitespace-nowrap">
                              Baker&apos;s %
                            </th>
                            <th className="border-r border-foreground/10 px-2.5 py-2 font-normal">
                              Prep Notes / Sourcing
                            </th>
                            <th className="w-[70px] px-1.5 py-2 text-right font-normal">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {section.ingredients.map((ing, ingIdx) => (
                            <tr
                              key={ing.id || ingIdx}
                              className="group/row border-b border-foreground/10 transition-colors last:border-b-0 hover:bg-foreground/[0.02]"
                            >
                              <td className="border-r border-foreground/10 bg-foreground/[0.02] text-center font-mono text-[11px] text-foreground/45 select-none">
                                {ingIdx + 1}
                              </td>

                              {/* Ingredient Name */}
                              <td className="border-r border-foreground/10 p-0 transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]">
                                <input
                                  type="text"
                                  size={1}
                                  data-rcell={`${secIdx}-${ingIdx}-name`}
                                  value={ing.name}
                                  onChange={(e) =>
                                    handleUpdateIngredient(
                                      secIdx,
                                      ingIdx,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, secIdx, ingIdx, "name")
                                  }
                                  onPaste={(e) =>
                                    handleNamePaste(e, secIdx, ingIdx)
                                  }
                                  placeholder="Ingredient name..."
                                  className="min-h-[38px] w-full min-w-0 px-2.5 py-2 text-[13px] font-normal text-foreground placeholder:text-foreground/30"
                                />
                              </td>

                              {/* Amount */}
                              <td className="border-r border-foreground/10 p-0 transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]">
                                <DecimalCell
                                  dataCell={`${secIdx}-${ingIdx}-amount`}
                                  value={ing.amount}
                                  onCommit={(val) =>
                                    handleUpdateIngredient(
                                      secIdx,
                                      ingIdx,
                                      "amount",
                                      val ?? 0,
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(
                                      e,
                                      secIdx,
                                      ingIdx,
                                      "amount",
                                    )
                                  }
                                  placeholder="0"
                                  className="min-h-[38px] w-full min-w-0 px-2.5 py-2 text-right font-mono text-[13px] font-normal text-foreground tabular-nums placeholder:text-foreground/30"
                                />
                              </td>

                              {/* Unit */}
                              <td className="border-r border-foreground/10 p-0 transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]">
                                <input
                                  type="text"
                                  size={1}
                                  list={unitsListId}
                                  data-rcell={`${secIdx}-${ingIdx}-unit`}
                                  value={ing.unit}
                                  onChange={(e) =>
                                    handleUpdateIngredient(
                                      secIdx,
                                      ingIdx,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, secIdx, ingIdx, "unit")
                                  }
                                  placeholder="g"
                                  className="min-h-[38px] w-full min-w-0 px-2 py-2 text-[12.5px] font-normal text-foreground/70 focus:text-foreground placeholder:text-foreground/30"
                                />
                              </td>

                              {/* Baker's % (Integrated % suffix inside cell) */}
                              <td className="border-r border-foreground/10 p-0 transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]">
                                <div className="flex items-center pr-2">
                                  <DecimalCell
                                    dataCell={`${secIdx}-${ingIdx}-pct`}
                                    allowEmpty
                                    value={ing.percentage}
                                    onCommit={(val) =>
                                      handleUpdateIngredient(
                                        secIdx,
                                        ingIdx,
                                        "percentage",
                                        val,
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleCellKeyDown(e, secIdx, ingIdx, "pct")
                                    }
                                    placeholder="—"
                                    className="min-h-[38px] min-w-0 flex-1 py-2 pl-2 text-right font-mono text-[13px] font-normal text-foreground tabular-nums placeholder:text-foreground/30"
                                  />
                                  <span className="ml-0.5 text-[11px] text-foreground/45 select-none">
                                    %
                                  </span>
                                </div>
                              </td>

                              {/* Prep Notes / Sourcing */}
                              <td className="border-r border-foreground/10 p-0 transition-colors focus-within:relative focus-within:z-10 focus-within:bg-foreground/[0.03] focus-within:shadow-[inset_0_0_0_1.5px_var(--foreground)]">
                                <input
                                  type="text"
                                  size={1}
                                  data-rcell={`${secIdx}-${ingIdx}-notes`}
                                  value={ing.notes || ""}
                                  onChange={(e) =>
                                    handleUpdateIngredient(
                                      secIdx,
                                      ingIdx,
                                      "notes",
                                      e.target.value,
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(
                                      e,
                                      secIdx,
                                      ingIdx,
                                      "notes",
                                    )
                                  }
                                  placeholder="Prep or sourcing notes..."
                                  className="min-h-[38px] w-full min-w-0 px-2.5 py-2 text-[12.5px] font-normal text-foreground/70 focus:text-foreground placeholder:text-foreground/30"
                                />
                              </td>

                              {/* Subtle Hover/Focus Row Actions */}
                              <td className="px-1 py-1 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end">
                                  <button
                                    type="button"
                                    disabled={ingIdx === 0}
                                    onClick={() =>
                                      handleMoveIngredient(secIdx, ingIdx, "up")
                                    }
                                    title="Move up"
                                    aria-label={`Move ${ing.name || "ingredient"} up`}
                                    className="flex h-6 w-5 items-center justify-center rounded-[4px] text-foreground/45 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:text-foreground/15 disabled:hover:bg-transparent"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      ingIdx === section.ingredients.length - 1
                                    }
                                    onClick={() =>
                                      handleMoveIngredient(
                                        secIdx,
                                        ingIdx,
                                        "down",
                                      )
                                    }
                                    title="Move down"
                                    aria-label={`Move ${ing.name || "ingredient"} down`}
                                    className="flex h-6 w-5 items-center justify-center rounded-[4px] text-foreground/45 transition-colors hover:bg-foreground/10 hover:text-foreground disabled:text-foreground/15 disabled:hover:bg-transparent"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteIngredient(secIdx, ingIdx)
                                    }
                                    title="Delete row"
                                    aria-label={`Delete ${ing.name || "ingredient"}`}
                                    className="flex h-6 w-5 items-center justify-center rounded-[4px] text-foreground/45 transition-colors hover:bg-red-500/10 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Clean Inline Add Ingredient Strip */}
                    <button
                      type="button"
                      onClick={() => handleAddIngredient(secIdx)}
                      className="flex w-full items-center justify-between border-t border-foreground/10 bg-foreground/[0.02] px-3 py-2 text-[12.5px] font-normal text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add ingredient
                      </span>
                      {secIdx === sections.length - 1 && (
                        <span className="text-[11.5px] text-foreground/45">
                          Enter to insert · Ctrl+V pastes Sheets
                        </span>
                      )}
                    </button>
                  </section>
                );
              })}
            </div>

            {/* Clean Dashed Add Section Footer */}
            <div className="border-t border-foreground/10 bg-foreground/[0.03] p-3">
              <button
                type="button"
                onClick={handleAddSection}
                className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-foreground/20 bg-white py-2 text-[12.5px] font-normal text-foreground/70 transition-colors hover:border-foreground hover:bg-foreground/[0.03] hover:text-foreground dark:bg-[#1e1a17]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Section
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SMART BULK IMPORT / PASTE */}
        {activeTab === "paste" && (
          <div className="cms-editor-reset space-y-4 p-4">
            <div className="rounded-[6px] border border-foreground/10 bg-foreground/[0.025] p-3 text-[12.5px] text-foreground">
              <p className="flex items-center gap-1.5 font-normal text-foreground">
                <Sparkles className="h-4 w-4 text-foreground/70" />
                Smart Recipe &amp; Spreadsheet Parser
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-foreground/70">
                Paste rows copied directly from{" "}
                <span className="text-foreground">Google Sheets / Excel</span>{" "}
                (TSV), Markdown tables, or notes. Section headers like{" "}
                <code>## Meat Base</code> or <code>1. MEAT BASE</code>{" "}
                automatically split sections.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <label className="font-normal text-foreground/70">
                  Paste Recipe or Table Data:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pasteMode}
                    onChange={(e) => setPasteMode(e.target.value as any)}
                    aria-label="Import destination mode"
                    className="rounded-[6px] border border-foreground/15 bg-white px-2.5 py-1.5 text-[12px] text-foreground focus:border-foreground dark:bg-[#181411]"
                  >
                    <option value="append">Append to selected section</option>
                    <option value="replace">Replace selected section</option>
                    <option value="new_section">Create new section</option>
                    <option value="all">
                      Replace entire recipe (All sections)
                    </option>
                  </select>

                  {pasteMode !== "all" && pasteMode !== "new_section" && (
                    <select
                      value={pasteTargetSection}
                      onChange={(e) =>
                        setPasteTargetSection(Number(e.target.value))
                      }
                      aria-label="Target section"
                      className="rounded-[6px] border border-foreground/15 bg-white px-2.5 py-1.5 text-[12px] text-foreground focus:border-foreground dark:bg-[#181411]"
                    >
                      {sections.map((s, idx) => (
                        <option key={s.id || idx} value={idx}>
                          Target: {s.sectionName || `Section ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                spellCheck={false}
                placeholder={`Examples:\n\n## Meat Base\nPork Neck / Collar\t750\tg\t75.0%\tCut into 1.5cm cubes\nPork Belly\t250\tg\t25.0%\tSkinless\n\n## Seasonings\n16g Fine Sea Salt (1.6%) - Balanced snap`}
                className="w-full rounded-[6px] border border-foreground/15 bg-white p-3 font-mono text-[12px] leading-relaxed text-foreground focus:border-foreground dark:bg-[#181411]"
              />
            </div>

            {pasteText.trim() && (
              <div className="rounded-[6px] border border-foreground/10 bg-foreground/[0.02] p-3">
                <div className="mb-2 text-[12px] font-normal text-foreground/70">
                  Detected Preview:
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {parseRecipeText(pasteText).map((sec, idx) => (
                    <div
                      key={idx}
                      className="rounded-[5px] border border-foreground/10 bg-white p-2.5 text-[12px] dark:bg-[#1e1a17]"
                    >
                      <div className="mb-1 text-foreground">
                        {sec.sectionName}{" "}
                        <span className="text-foreground/60">
                          ({sec.ingredients.length} items)
                        </span>
                      </div>
                      <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-foreground/70">
                        {sec.ingredients.map((ing, iIdx) => (
                          <li key={iIdx}>
                            <span className="text-foreground">{ing.name}</span>:{" "}
                            {ing.amount} {ing.unit}{" "}
                            {ing.percentage != null && `(${ing.percentage}%)`}{" "}
                            {ing.notes && (
                              <span className="text-foreground/55">
                                — {ing.notes}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-foreground/10 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab("grid")}
                className="rounded-[6px] border border-foreground/15 bg-white px-3 py-1.5 text-[12px] font-normal text-foreground/70 hover:text-foreground dark:bg-[#1e1a17]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={handleApplyPaste}
                className="flex items-center gap-1.5 rounded-[6px] bg-foreground px-4 py-1.5 text-[12px] font-normal text-white hover:opacity-90 disabled:opacity-40 dark:text-[#181411]"
              >
                <Check className="h-3.5 w-3.5" />
                Import Ingredients
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: EXPORT / COPY */}
        {activeTab === "export" && (
          <div className="cms-editor-reset space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-[6px] border border-foreground/10 bg-foreground/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-normal text-foreground">
                    <FileText className="h-3.5 w-3.5 text-foreground/70" />
                    Markdown Format
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(generateMarkdownTable(), "markdown")
                    }
                    className="rounded-[5px] border border-foreground/15 bg-white px-2.5 py-1 text-[11.5px] font-normal text-foreground/70 hover:border-foreground/40 hover:text-foreground dark:bg-[#1e1a17]"
                  >
                    {copiedNotification === "markdown"
                      ? "Copied!"
                      : "Copy Markdown"}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={generateMarkdownTable()}
                  className="w-full rounded-[5px] border border-foreground/15 bg-white p-2.5 font-mono text-[11.5px] text-foreground/70 select-all dark:bg-[#181411]"
                />
              </div>

              <div className="space-y-2 rounded-[6px] border border-foreground/10 bg-foreground/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-normal text-foreground">
                    <TableIcon className="h-3.5 w-3.5 text-foreground/70" />
                    TSV (Excel / Google Sheets)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generateTSV(), "tsv")}
                    className="rounded-[5px] border border-foreground/15 bg-white px-2.5 py-1 text-[11.5px] font-normal text-foreground/70 hover:border-foreground/40 hover:text-foreground dark:bg-[#1e1a17]"
                  >
                    {copiedNotification === "tsv" ? "Copied!" : "Copy TSV"}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={generateTSV()}
                  className="w-full rounded-[5px] border border-foreground/15 bg-white p-2.5 font-mono text-[11.5px] text-foreground/70 select-all dark:bg-[#181411]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE INTERACTIVE PREVIEW */}
        {activeTab === "preview" && (
          <div className="bg-background p-5">
            <RecipeScaler
              title={sibling.title || "Interactive Recipe Scaler"}
              description={sibling.description}
              baseYield={baseYield}
              yieldUnit={yieldUnit}
              yieldLabel={sibling.yieldLabel || "Target Batch Size"}
              presets={sibling.presets || "500, 1000, 2000, 5000"}
              footnote={sibling.footnote}
              sections={sections}
            />
          </div>
        )}
      </div>
    </div>
  );
}
