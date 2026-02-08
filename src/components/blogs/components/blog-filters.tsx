"use client";

import { BlogTag } from "@/payload-types";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import clsx from "clsx";

export default function BlogFilters({ tags }: { tags: BlogTag[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTags = searchParams.get("tags");
  const currentTags = rawTags ? rawTags.split(",") : [];
  const currentSort = searchParams.get("sort") || "newest";

  const updateSort = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    router.push(`/notes?${params.toString()}`, { scroll: false });
  };

  const toggleTag = (tagName: string) => {
    const params = new URLSearchParams(searchParams.toString());

    let newTags: string[];

    if (currentTags.includes(tagName)) {
      newTags = currentTags.filter((t) => t !== tagName);
    } else {
      newTags = [...currentTags, tagName];
    }

    if (newTags.length > 0) {
      params.set("tags", newTags.join(","));
    } else {
      params.delete("tags");
    }

    router.push(`/notes?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    router.push(`/notes?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="px-2.5 sm:px-0">
      <div className="border-border-color flex flex-col gap-4 border-b border-dashed py-4">
        <div className="border-border-color flex items-center justify-between border-b border-dashed pb-2">
          <span className="font-roboto text-sm font-light">Filters</span>

          <select
            value={currentSort}
            onChange={(e) => updateSort(e.target.value)}
            className="border-border-color hover:border-utils-scent-orange cursor-pointer rounded-md border border-dashed bg-transparent p-1 text-sm transition-colors focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title-asc">A-Z</option>
            <option value="title-desc">Z-A</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={clearFilters}
            className={clsx(
              "rounded-full border border-dashed px-4 py-1 text-sm transition-all duration-200 ease-in-out",
              currentTags.length === 0
                ? "bg-foreground text-background border-foreground"
                : "border-foreground/20 hover:border-foreground/80 text-foreground bg-transparent",
            )}
          >
            All
          </button>

          {tags.map((tag) => {
            const isSelected = currentTags.includes(tag.name);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.name)}
                style={{
                  ["--tag-color" as any]: tag.color || "#666",
                  borderColor: isSelected ? "var(--tag-color)" : "#cecece",
                  backgroundColor: isSelected
                    ? "var(--tag-color)"
                    : "transparent",
                  color: isSelected ? "#fff" : "var(--tag-color)",
                }}
                className={clsx(
                  "relative flex cursor-pointer items-center gap-1 rounded-full border border-dashed py-1 pr-2 pl-3 text-sm",
                  !isSelected && "pr-3",
                )}
              >
                {tag.name}
                {isSelected && <X size={12} className="ml-1 text-white" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
