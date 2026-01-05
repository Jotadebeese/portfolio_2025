export function ProjectsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8 py-10">
      <div className="flex flex-col gap-4">
        <div className="border-border-color flex w-full justify-end border-b border-dashed pb-2">
          <div className="h-6 w-16 rounded bg-gray-200/50" />
        </div>

        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex w-full flex-col gap-5 rounded-lg border border-transparent bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-28 shrink-0 rounded-2xl bg-gray-200" />

                <div className="flex flex-1 flex-col gap-2 py-1">
                  <div className="h-6 w-3/4 rounded bg-gray-300" />{" "}
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-5/6 rounded bg-gray-200" />
                  <div className="mt-2 flex gap-2">
                    <div className="h-5 w-12 rounded-md bg-gray-200" />
                    <div className="h-5 w-16 rounded-md bg-gray-200" />
                  </div>
                </div>
              </div>

              <div className="mt-auto flex justify-end gap-3">
                <div className="h-8 w-16 rounded-md bg-gray-200" />
                <div className="h-8 w-20 rounded-md bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
