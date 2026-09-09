import { ToolId } from "../types";

export default function ToolSkeleton({ toolId }: { toolId?: ToolId }) {
  if (toolId === "secret-generator") {
    return (
      <div className="flex animate-pulse flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs">
            <div className="bg-utils-scent-gray-01/70 h-4 w-4 shrink-0 rounded-full" />
            <div className="bg-utils-scent-gray-01/60 hidden h-4 w-40 rounded-md sm:inline-block" />
            <div className="bg-utils-scent-gray-01/40 h-5 w-36 rounded-md" />
          </div>
          <div className="bg-background h-7 w-28 shrink-0 rounded-md" />
        </div>

        <div className="flex flex-col">
          {[
            { titleW: "w-44", descW: "w-60" },
            { titleW: "w-36", descW: "w-52" },
            { titleW: "w-48", descW: "w-64" },
          ].map((item, i) => (
            <div
              key={i}
              className="border-border-color flex flex-col gap-3 border-b border-dashed py-4 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <small
                  className={`block h-4 ${item.titleW} bg-utils-scent-gray-01/60 rounded-md`}
                />
                <span
                  className={`bg-background hidden h-6 ${item.descW} rounded-md px-1.5 py-1 text-xs sm:inline-block`}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="border-border-color flex-1 overflow-x-auto whitespace-nowrap rounded-md border bg-white px-3 py-2 font-mono text-xs select-all sm:text-sm">
                  <div className="bg-utils-scent-gray-01/40 h-4 w-3/4 rounded" />
                </div>

                <div className="border-border-color flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-white">
                  <div className="bg-utils-scent-gray-01/60 h-3.5 w-3.5 rounded" />
                </div>

                <div className="border-border-color flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-white">
                  <div className="bg-utils-scent-gray-01/60 h-3.5 w-3.5 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="bg-utils-scent-gray-01/70 h-3.5 w-3.5 rounded-full" />
              <small className="flex items-center gap-1">
                <div className="bg-utils-scent-gray-01/60 h-4 w-32 rounded-md" />
                <div className="bg-background h-6 w-14 rounded-md" />
              </small>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:gap-3">
              <div className="bg-utils-scent-gray-01/50 h-4 w-24 rounded-md" />
              <div className="bg-utils-scent-gray-01/50 h-4 w-28 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="border-border-color flex-1 overflow-x-auto whitespace-nowrap rounded-md border bg-white px-3 py-2 font-mono text-xs select-all sm:text-sm">
              <div className="bg-utils-scent-gray-01/40 h-4 w-1/2 rounded" />
            </div>

            <div className="border-border-color flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-white">
              <div className="bg-utils-scent-gray-01/60 h-3.5 w-3.5 rounded" />
            </div>

            <div className="border-border-color flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-white">
              <div className="bg-utils-scent-gray-01/60 h-3.5 w-3.5 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (toolId === "jwt-inspector") {
    return (
      <div className="flex w-full animate-pulse flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="bg-utils-scent-gray-01/70 h-4 w-48 rounded-md" />
          <div className="bg-background h-7 w-24 rounded-md" />
        </div>
        <div className="border-border-color bg-background/50 h-24 w-full rounded-md border" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="border-border-color bg-background/50 h-44 rounded-md border" />
          <div className="border-border-color bg-background/50 h-44 rounded-md border" />
        </div>
      </div>
    );
  }

  if (toolId === "image-optimizer") {
    return (
      <div className="flex w-full animate-pulse flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="bg-utils-scent-gray-01/70 h-4 w-48 rounded-md" />
          <div className="bg-background h-7 w-24 rounded-md" />
        </div>
        <div className="border-border-color bg-background/40 h-36 w-full rounded-md border border-dashed" />
        <div className="border-border-color bg-background/50 h-10 w-full rounded-md border" />
      </div>
    );
  }

  return (
    <div className="flex w-full animate-pulse flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="bg-utils-scent-gray-01/70 h-4 w-48 rounded-md" />
        <div className="bg-background h-7 w-24 rounded-md" />
      </div>
      <div className="border-border-color bg-background/50 h-32 w-full rounded-md border" />
    </div>
  );
}
