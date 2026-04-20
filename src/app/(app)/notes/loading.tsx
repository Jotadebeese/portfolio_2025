import { BlogsSkeleton } from "@/components/blogs/layout/blogs-section-skeleton";

export default function Loading() {
  return (
    <>
      <div className="w-full max-w-3xl sm:border-border-color bg-foreground/5 animate-pulse relative flex h-80 items-end overflow-hidden p-2.5 sm:rounded-lg sm:border sm:p-5 sm:shadow-sm" />

      <div className="px-2.5 sm:px-0 animate-pulse mt-6">
        <div className="border-border-color flex flex-col gap-4 border-b border-dashed py-4">
          <div className="border-border-color flex items-center justify-between border-b border-dashed pb-2">
            <div className="h-4 w-12 rounded bg-foreground/10" />
            <div className="h-6 w-24 rounded bg-foreground/10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-16 rounded-full border border-dashed border-foreground/20 bg-foreground/5" />
            <div className="h-8 w-20 rounded-full border border-dashed border-foreground/20 bg-foreground/5" />
            <div className="h-8 w-24 rounded-full border border-dashed border-foreground/20 bg-foreground/5" />
          </div>
        </div>
      </div>

      <div className="mt-4 animate-pulse opacity-50">
        <BlogsSkeleton />
      </div>
    </>
  );
}
