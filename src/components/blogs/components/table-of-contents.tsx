"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Check, Link2, List, X as XIcon } from "lucide-react";
import linkedIn from "@/assets/linkedin.svg";
import X from "@/assets/x.svg";
import clsx from "clsx";
import Image from "next/image";
import { subscribeWorkbenchTools } from "@/components/tools/utils/toc-sync";

export type Heading = {
  id: string;
  text: string;
  level?: 2 | 3;
  parentId?: string;
  isWorkbenchParent?: boolean;
  isWorkbenchTool?: boolean;
};

type SectionGroup = {
  parent: Heading;
  children: Heading[];
};

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [items, setItems] = useState<Heading[]>(headings);
  const [activeId, setActiveId] = useState<string>(headings[0]?.id || "");
  const [isOpen, setIsOpen] = useState(false);

  const isClicking = useRef(false);

  useEffect(() => {
    setItems(headings);
  }, [headings]);

  useEffect(() => {
    return subscribeWorkbenchTools((activeTools) => {
      setItems((prevItems) => {
        const hasWorkbench =
          prevItems.some(
            (item) =>
              item.isWorkbenchParent ||
              item.id === "tools-workbench" ||
              item.isWorkbenchTool ||
              item.parentId === "tools-workbench",
          ) ||
          (typeof document !== "undefined" &&
            Boolean(document.getElementById("tools-workbench")));

        if (!hasWorkbench) {
          return prevItems;
        }

        const parentItem = prevItems.find(
          (item) => item.isWorkbenchParent || item.id === "tools-workbench",
        );
        const parentId = parentItem?.id || "tools-workbench";

        const nonToolItems = prevItems.filter(
          (item) => !item.isWorkbenchTool && item.parentId !== parentId,
        );

        const targetIndex = nonToolItems.findIndex(
          (item) => item.id === parentId || item.isWorkbenchParent,
        );

        if (targetIndex === -1) {
          if (activeTools.length > 0) {
            const workbenchHeading: Heading = {
              id: parentId,
              text: "Tools Workbench",
              level: 2,
              isWorkbenchParent: true,
            };
            const newToolHeadings: Heading[] = activeTools.map((tool) => ({
              id: tool.id,
              text: tool.name,
              level: 3,
              parentId,
              isWorkbenchTool: true,
            }));
            return [workbenchHeading, ...newToolHeadings, ...nonToolItems];
          }
          return prevItems;
        }

        const newToolHeadings: Heading[] = activeTools.map((tool) => ({
          id: tool.id,
          text: tool.name,
          level: 3,
          parentId,
          isWorkbenchTool: true,
        }));

        const next = [...nonToolItems];
        next.splice(targetIndex + 1, 0, ...newToolHeadings);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClicking.current) return;

        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px" },
    );

    items.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      window.history.pushState(window.history.state, "", `#${id}`);
      element.scrollIntoView({ behavior: "smooth" });
    }

    isClicking.current = true;
    setActiveId(id);
    setIsOpen(false);

    setTimeout(() => {
      isClicking.current = false;
    }, 800);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    await navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareTo = (platform: "x" | "linkedin") => {
    const url = encodeURIComponent(
      typeof window !== "undefined" ? window.location.href : "",
    );
    const title = encodeURIComponent(document.title);
    const links = {
      x: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}`,
    };
    window.open(links[platform], "_blank", "width=600,height=400");
  };

  const groups = useMemo(() => {
    const list: SectionGroup[] = [];
    let currentGroup: SectionGroup | null = null;

    items.forEach((item) => {
      if (item.level === 3) {
        if (currentGroup) {
          currentGroup.children.push(item);
        } else {
          currentGroup = {
            parent: { id: item.id, text: item.text, level: 2 },
            children: [item],
          };
          list.push(currentGroup);
        }
      } else {
        currentGroup = {
          parent: item,
          children: [],
        };
        list.push(currentGroup);
      }
    });

    return list;
  }, [items]);

  const activeParentId = useMemo(() => {
    const activeItem = items.find((i) => i.id === activeId);
    if (!activeItem) return items[0]?.id;

    if (activeItem.level === 3) {
      if (activeItem.parentId) return activeItem.parentId;
      const activeIdx = items.indexOf(activeItem);
      const precedingParent = items
        .slice(0, activeIdx)
        .reverse()
        .find((i) => i.level !== 3);
      return precedingParent?.id || activeItem.id;
    }

    return activeItem.id;
  }, [items, activeId]);

  const groupsWithChildren = useMemo(
    () => groups.filter((g) => g.children.length > 0),
    [groups],
  );

  if (items.length === 0) return null;

  const content = (
    <>
      <nav className="flex flex-col gap-1 text-left">
        {groups.map((group) => {
          const isParentActive = activeId === group.parent.id;
          const isParentOfActive = group.children.some(
            (child) => child.id === activeId,
          );
          const isExpanded =
            group.parent.id === activeParentId ||
            (groupsWithChildren.length <= 1 && group.children.length > 0);

          return (
            <div key={group.parent.id} className="flex flex-col">
              <Link
                href={`#${group.parent.id}`}
                onClick={(e) => handleClick(e, group.parent.id)}
                className={clsx(
                  "block rounded-full px-3 py-2 text-sm transition-all",
                  isParentActive
                    ? "bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border font-medium shadow-xs"
                    : isParentOfActive
                      ? "text-foreground border border-transparent font-medium"
                      : "text-foreground/60 hover:text-foreground hover:bg-utils-scent-gray-01/30 border border-transparent",
                )}
                title={group.parent.text}
              >
                <span className="block truncate">{group.parent.text}</span>
              </Link>

              {group.children.length > 0 && (
                <div
                  className={clsx(
                    "grid transition-all duration-300 ease-in-out",
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "pointer-events-none grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="border-border-color my-1 ml-3.5 flex flex-col gap-0.5 border-l border-dashed pl-3">
                      {group.children.map((child) => {
                        const isChildActive = activeId === child.id;

                        return (
                          <Link
                            key={child.id}
                            href={`#${child.id}`}
                            onClick={(e) => handleClick(e, child.id)}
                            className={clsx(
                              "group/sub relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all",
                              isChildActive
                                ? "bg-utils-scent-gray-01/60 text-foreground font-medium"
                                : "text-foreground/55 hover:text-foreground hover:bg-utils-scent-gray-01/30",
                            )}
                            title={child.text}
                          >
                            <span
                              className={clsx(
                                "h-1 w-1 shrink-0 rounded-full transition-all",
                                isChildActive
                                  ? "bg-foreground scale-110"
                                  : "bg-foreground/25 group-hover/sub:bg-foreground/60",
                              )}
                            />
                            <span className="block truncate">{child.text}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-border-color my-4 border-b border-dashed"></div>

      <div className="flex flex-col gap-2">
        <span className="pl-3 text-xs font-bold tracking-wider uppercase">
          Share:
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => shareTo("x")}
            className="hover:bg-utils-scent-gray-01/30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all"
            aria-label="Share on X"
          >
            <Image src={X} alt="X" width={18} height={18} />
          </button>
          <button
            onClick={() => shareTo("linkedin")}
            className="hover:bg-utils-scent-gray-01/30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all"
            aria-label="Share on LinkedIn"
          >
            <Image src={linkedIn} alt="LinkedIn" width={18} height={18} />
          </button>
          <button
            onClick={handleCopy}
            className="hover:bg-utils-scent-gray-01/30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all"
            aria-label="Copy link"
          >
            {isCopied ? <Check size={18} /> : <Link2 size={18} />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden max-w-3xl md:col-span-3 md:mt-5 md:block">
        <div className="sticky top-24 bg-white p-2 sm:rounded-3xl sm:shadow-sm">
          {content}
        </div>
      </aside>

      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-foreground text-background fixed right-2.5 bottom-18 z-40 flex cursor-pointer items-center justify-center rounded-full p-3 shadow-sm transition-transform active:scale-95 sm:right-5"
          aria-label="Table of Contents"
        >
          <List size={20} />
        </button>
        {isOpen && (
          <div
            className="fixed inset-0 z-60 bg-black/40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
        )}

        <div
          className={clsx(
            "fixed right-0 bottom-0 left-0 z-70 rounded-t-3xl bg-white p-2 shadow-2xl transition-transform duration-300 ease-in-out",
            isOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mb-2 flex items-center justify-between pl-3">
            <h4>Table of Contents</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <XIcon size={20} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">{content}</div>
        </div>
      </div>
    </>
  );
}
