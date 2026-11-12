export function ProjectsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-4 pb-10">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`border-border-color/50 flex w-full flex-col rounded-xl border bg-white/30 p-1 ${
              i === 0 ? "md:col-span-2" : ""
            }`}
          >
            <div className="flex flex-1 flex-col gap-5 rounded-lg bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-16 rounded bg-gray-200" />
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-14 rounded bg-gray-200" />
                  <div className="size-2.5 rounded-full bg-gray-200" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-2/5 rounded bg-gray-300" />
                  <div className="h-8 w-12 rounded-lg bg-gray-200" />
                </div>
                <div className="h-3.5 w-full rounded bg-gray-200" />
                <div className="h-3.5 w-4/5 rounded bg-gray-200" />
                <div className="mt-1 flex gap-2">
                  <div className="h-5 w-16 rounded-md bg-gray-200" />
                  <div className="h-5 w-24 rounded-md bg-gray-200" />
                </div>
              </div>

              <div className="border-border-color mt-auto flex justify-end gap-4 border-t border-dashed pt-3">
                <div className="h-5 w-16 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
