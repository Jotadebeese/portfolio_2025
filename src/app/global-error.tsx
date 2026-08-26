"use client";

import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#eeeeee] text-[#181411] antialiased flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-6xl font-light">Oops!</h1>
        <p className="mt-4 mb-8 max-w-md text-sm">
          A critical error occurred. Please try refreshing the page.
        </p>
        <button
          onClick={() => reset()}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#181411] px-5 py-2.5 text-sm font-medium text-[#eeeeee] transition-all hover:bg-[#ff9900]"
        >
          <RotateCcw size={16} />
          Try Again
        </button>
      </body>
    </html>
  );
}
