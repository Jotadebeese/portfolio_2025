import type { Metadata } from "next";
import ToolsWorkbench from "@/components/tools/layout/tools-workbench";
import { LIVE_TOOL_IDS } from "@/components/tools/types";

export const metadata: Metadata = {
  title: {
    absolute: "forthweb — Browser-Native Developer Tools",
  },
  description:
    "Browser-native developer utilities running 100% locally in your browser — image optimization, GPU video compression, and cryptographic key generation with zero server uploads.",
  alternates: {
    canonical: "/",
  },
};

export default function ForthwebHomePage() {
  return (
    <div className="flex w-full flex-col gap-10 px-2.5 pt-8 sm:px-5 sm:pt-10">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <h1 className="text-5xl sm:text-7xl">forthweb</h1>
        <p className="text-foreground/80 max-w-2xl text-base sm:text-lg">
          Browser-native developer utilities running 100% locally on your
          device, zero server uploads.
        </p>
      </div>

      <div className="border-border-color border-t border-dashed pt-6">
        <ToolsWorkbench
          availableTools={LIVE_TOOL_IDS}
          defaultTools={["image-optimizer"]}
          hideHeading
          standaloneBasePath="/"
        />
      </div>
    </div>
  );
}
