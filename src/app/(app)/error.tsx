"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";
import CTAButton from "@/components/common/cta-button";

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
        <CTAButton onClick={() => reset()} variant="primary">
          <RotateCcw size={16} aria-hidden="true" />
          <span>Try Again</span>
        </CTAButton>
        <CTAButton href="/" variant="secondary">
          <Home size={16} aria-hidden="true" />
          <span>Back Home</span>
        </CTAButton>
      </div>
    </div>
  );
}
