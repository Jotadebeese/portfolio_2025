export function ProjectsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-4 pb-10">
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex w-full flex-col justify-between gap-5 rounded-lg bg-white p-4 shadow-sm ${
              i === 0 ? "md:col-span-2" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-7 rounded bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-16 rounded bg-gray-200" />
                <div className="h-5 w-20 rounded-full bg-gray-200" />
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

            <div className="mt-auto flex justify-end gap-4">
              <div className="h-5 w-16 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
