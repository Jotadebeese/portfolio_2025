"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Link2, Minus, Plus, RotateCcw } from "lucide-react";

export type IngredientItem = {
  id?: string | null;
  name: string;
  amount: number;
  unit: string;
  percentage?: number | null;
  notes?: string | null;
};

export type IngredientSection = {
  id?: string | null;
  sectionName: string;
  ingredients: IngredientItem[];
};

export type RecipeScalerProps = {
  title?: string | null;
  description?: string | null;
  baseYield?: number | null;
  yieldUnit?: string | null;
  yieldLabel?: string | null;
  presets?: string | null;
  footnote?: string | null;
  sections: IngredientSection[];
  className?: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function formatAmount(amount: number): string {
  if (amount >= 100) return Math.round(amount).toLocaleString();
  const rounded = Math.round(amount * 10) / 10;
  return rounded.toLocaleString();
}

function formatPreset(value: number, unit: string): string {
  if (unit === "g" && value >= 1000) return `${value / 1000} kg`;
  return `${value} ${unit}`;
}

export default function RecipeScaler({
  title,
  description,
  baseYield = 1000,
  yieldUnit = "g",
  yieldLabel,
  presets,
  footnote,
  sections = [],
  className,
}: RecipeScalerProps) {
  const base = baseYield && baseYield > 0 ? baseYield : 1000;
  const unit = yieldUnit || "g";

  const [batch, setBatch] = useState<number>(base);
  const [inputText, setInputText] = useState<string>(String(base));
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const presetList = (presets || "")
    .split(",")
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n) && n > 0);

  const multiplier = batch > 0 ? batch / base : 1;
  const hasPercentages = sections.some((s) =>
    s.ingredients?.some((i) => i.percentage != null),
  );
  const isDirty = batch !== base || checked.size > 0;

  const setBatchValue = (value: number) => {
    const next = Math.max(0, value);
    setBatch(next);
    setInputText(String(next));
  };

  const step = (delta: number) => setBatchValue(Math.max(100, batch + delta));

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reset = () => {
    setBatchValue(base);
    setChecked(new Set());
  };

  const id = title ? slugify(title) : "recipe-scaler";

  return (
    <section
      id={id}
      className={clsx("flex w-full scroll-mt-24 flex-col gap-2", className)}
    >
      {(title || description) && (
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
          {description && (
            <p className="text-foreground leading-7">{description}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex h-8 items-center rounded-md bg-white shadow-xs"
          aria-label={yieldLabel || "Batch size"}
        >
          <button
            type="button"
            onClick={() => step(-100)}
            disabled={batch <= 100}
            className="text-foreground/70 hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
            title="Decrease batch (-100)"
            aria-label="Decrease batch size"
          >
            <Minus size={13} />
          </button>

          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={50}
            value={inputText}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setInputText(e.target.value);
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed) && parsed > 0) setBatch(parsed);
            }}
            onBlur={() => setInputText(String(batch))}
            className="text-foreground w-12 [appearance:textfield] bg-transparent text-center text-xs tabular-nums focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label={yieldLabel || "Batch size"}
          />

          <span className="text-foreground/50 font-mono text-xs">{unit}</span>

          <button
            type="button"
            onClick={() => step(100)}
            className="text-foreground/70 hover:text-foreground flex h-8 w-8 cursor-pointer items-center justify-center transition-all active:scale-90"
            title="Increase batch (+100)"
            aria-label="Increase batch size"
          >
            <Plus size={13} />
          </button>
        </div>

        {presetList.map((preset) => {
          const isActive = batch === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setBatchValue(preset)}
              className={clsx(
                "h-8 cursor-pointer rounded-md border px-3 text-xs tabular-nums transition-all",
                isActive
                  ? "text-foreground border-white bg-white shadow-xs"
                  : "border-border-color text-foreground/70 hover:text-foreground hover:border-foreground/40 border-dashed",
              )}
            >
              {formatPreset(preset, unit)}
            </button>
          );
        })}

        {isDirty && (
          <button
            type="button"
            onClick={reset}
            className="text-foreground/70 hover:text-foreground ml-auto flex cursor-pointer items-center gap-1.5 text-xs transition-all"
            title="Reset to default batch and clear checked items"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 rounded-lg bg-white p-2.5 shadow-sm">
        <div className="flex flex-col gap-4">
          {sections.map((section, sIdx) => {
            const subtotal = (section.ingredients || []).reduce(
              (sum, item) =>
                item.unit === unit ? sum + item.amount * multiplier : sum,
              0,
            );

            return (
              <div
                key={section.id || sIdx}
                id={slugify(section.sectionName)}
                className="flex scroll-mt-24 flex-col bg-white"
              >
                <div className="border-border-color/40 text-foreground/70 flex items-center justify-between gap-2 border-b p-2 text-xs">
                  <span className="tracking-wider uppercase">
                    {section.sectionName} ({(section.ingredients || []).length})
                  </span>
                  {subtotal > 0 && (
                    <span className="text-foreground/70 text-sm">
                      {formatAmount(subtotal)} {unit}
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  {(section.ingredients || []).map((item, iIdx) => {
                    const key = `${sIdx}-${iIdx}`;
                    const isChecked = checked.has(key);

                    return (
                      <div
                        key={item.id || iIdx}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onClick={() => toggle(key)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggle(key);
                          }
                        }}
                        className={clsx(
                          "group border-utils-scent-gray-01/40 flex cursor-pointer items-center justify-between gap-3 border-b p-2 transition-all select-none",
                          sIdx === sections.length - 1 && "last:border-b-0",
                          isChecked
                            ? "bg-background/40"
                            : "hover:bg-utils-scent-gray-01/15 bg-white",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span
                            className={clsx(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all",
                              isChecked
                                ? "border-utils-scent-orange bg-utils-scent-orange/60 text-white"
                                : "border-border-color group-hover:border-utils-scent-orange bg-white",
                            )}
                          >
                            <Check
                              size={12}
                              strokeWidth={4}
                              className={clsx(
                                "transition-all duration-100",
                                isChecked
                                  ? "scale-100 opacity-100"
                                  : "scale-50 opacity-0",
                              )}
                            />
                          </span>

                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <span
                                className={clsx(
                                  "text-sm transition-all",
                                  isChecked
                                    ? "text-foreground/45 line-through"
                                    : "text-foreground",
                                )}
                              >
                                {item.name}
                              </span>

                              {item.percentage != null && (
                                <span className="bg-background text-foreground/70 shrink-0 rounded px-1 py-0.5 text-xs">
                                  {item.percentage}%
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <span
                                className={clsx(
                                  "text-xs transition-all",
                                  isChecked
                                    ? "text-foreground/35"
                                    : "text-foreground/60",
                                )}
                              >
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center">
                          <span
                            className={clsx(
                              "bg-background/70 rounded px-1.5 py-0.5 text-xs tabular-nums transition-all",
                              isChecked
                                ? "text-foreground/40 line-through"
                                : "text-foreground",
                            )}
                          >
                            {formatAmount(item.amount * multiplier)}{" "}
                            <span>{item.unit}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {footnote && <p className="text-foreground/70 text-xs">{footnote}</p>}
    </section>
  );
}
