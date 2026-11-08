"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";

export default function InteractiveChecklistItem({
  initialChecked,
  children,
}: {
  initialChecked: boolean;
  children: React.ReactNode;
}) {
  const [checked, setChecked] = useState(initialChecked);

  return (
    <li className="flex items-start gap-2 -ml-6 list-none">
      <button
        onClick={() => setChecked(!checked)}
        className={clsx(
          "mt-1 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-all",
          checked
            ? "bg-utils-scent-orange/60 border-utils-scent-orange text-white"
            : "border-border-color bg-white hover:border-utils-scent-orange",
        )}
        aria-label={checked ? "Uncheck item" : "Check item"}
      >
        <Check
          size={12}
          strokeWidth={4}
          className={clsx(
            "transition-all duration-100",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </button>
      <span
        onClick={() => setChecked(!checked)}
        className={clsx(
          "flex-1 transition-all cursor-pointer",
          checked ? "line-through text-foreground/60 [&_strong]:text-foreground/60" : ""
        )}
      >
        {children}
      </span>
    </li>
  );
}
