"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl md:text-[8rem] font-light">Oops!</h1>
      <p className="text-foreground mt-4 mb-8 max-w-md text-sm sm:text-base">
        Something went wrong while loading this page. Please try again or head back home.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:bg-utils-scent-orange focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
        >
          <RotateCcw size={16} />
          Try Again
        </button>
        <Link
          href="/"
          className="bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground hover:bg-utils-scent-gray-01 flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
        >
          <Home size={16} />
          Back Home
        </Link>
      </div>
    </div>
  );
}
