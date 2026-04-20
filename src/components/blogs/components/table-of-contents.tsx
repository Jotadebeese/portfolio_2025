"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Check, Link2, List, X as XIcon } from "lucide-react"; // Import List and XIcon
import linkedIn from "@/assets/linkedin.svg";
import X from "@/assets/x.svg";

import clsx from "clsx";
import Image from "next/image";

type Heading = { id: string; text: string };

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id || "");
  const [isOpen, setIsOpen] = useState(false); // State for mobile bottom sheet

  const isClicking = useRef(false);

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

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      history.pushState(null, "", `#${id}`);
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

  if (headings.length === 0) return null;

  const content = (
    <>
      <nav className="flex flex-col gap-2 text-left">
        {headings.map((heading) => {
          const isActive = activeId === heading.id;

          return (
            <Link
              key={heading.id}
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              className={clsx(
                "block rounded-full px-3 py-2 text-sm transition-all",
                isActive
                  ? "bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground border shadow-sm"
                  : "hover:text-foreground text-foreground/50 hover:bg-utils-scent-gray-01/30 border border-transparent",
              )}
            >
              <span className="block truncate">{heading.text}</span>
            </Link>
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
            <Image src={X} alt="X" width={16} height={16} />
          </button>
          <button
            onClick={() => shareTo("linkedin")}
            className="hover:bg-utils-scent-gray-01/30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all"
            aria-label="Share on LinkedIn"
          >
            <Image src={linkedIn} alt="LinkedIn" width={16} height={16} />
          </button>
          <button
            onClick={handleCopy}
            className="hover:bg-utils-scent-gray-01/30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all"
            aria-label="Copy link"
          >
            {isCopied ? <Check size={16} /> : <Link2 size={16} />}
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
          className="bg-foreground text-background fixed right-2.5 bottom-15 z-40 flex cursor-pointer items-center justify-center rounded-full p-3 shadow-sm transition-transform active:scale-95 sm:right-5"
          aria-label="Table of Contents"
        >
          <List size={20} />
        </button>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
        )}

        <div
          className={clsx(
            "fixed right-0 bottom-0 left-0 z-50 rounded-t-3xl bg-white p-2 shadow-2xl transition-transform duration-300 ease-in-out",
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
          <div className="max-h-[60vh] overflow-y-auto pb-8">{content}</div>
        </div>
      </div>
    </>
  );
}
