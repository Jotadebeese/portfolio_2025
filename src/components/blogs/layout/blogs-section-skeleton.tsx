export function BlogsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5 p-2.5 sm:px-5">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="border-border-color flex w-full flex-col gap-2 border-b border-dashed py-5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1/3 rounded bg-gray-200" />
              <div className="h-4 w-4 rounded-full bg-gray-200" />
            </div>
            <div className="h-4 w-32 rounded bg-gray-200" />
          </div>

          <div className="max-w-lg space-y-2 py-1">
            <div className="h-4 w-full rounded bg-gray-200" />
          </div>

          <div className="mt-1 flex gap-2">
            <div className="h-5 w-16 rounded-md bg-gray-200" />
            <div className="h-5 w-20 rounded-md bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
