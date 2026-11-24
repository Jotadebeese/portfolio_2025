"use client";

import { usePathname } from "next/navigation";
import { PORTFOLIO_PUBLIC_URL } from "@/lib/forthweb-host";

function getUtmContent(pathname: string | null): string {
  if (!pathname) return "workbench";
  const normalized = pathname
    .replace(/^\/forthweb(?=\/|$)/, "")
    .replace(/^\/+|\/+$/g, "");
  return normalized || "workbench";
}

export default function ForthwebFooter({
  portfolioUrl = PORTFOLIO_PUBLIC_URL,
}: {
  portfolioUrl?: string;
}) {
  const pathname = usePathname();
  const utmContent = getUtmContent(pathname);
  const portfolioHref = `${portfolioUrl.replace(/\/$/, "")}?utm_source=forthweb&utm_medium=referral&utm_campaign=footer&utm_content=${encodeURIComponent(utmContent)}`;

  return (
    <footer className="relative z-30 flex w-full justify-center">
      <div className="flex w-full max-w-6xl justify-center px-2.5 sm:px-5">
        <div className="border-border-color flex w-full items-center justify-between border-t border-dashed py-4">
          <span className="text-xs">© {new Date().getFullYear()} forthweb</span>

          <span className="text-foreground/70 text-xs whitespace-nowrap sm:text-sm">
            Built by{" "}
            <a
              href={portfolioHref}
              target="_blank"
              rel="noopener"
              className="text-foreground decoration-border-color font-medium underline underline-offset-4 transition-colors hover:text-amber-600 hover:decoration-amber-600"
            >
              Juan
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
