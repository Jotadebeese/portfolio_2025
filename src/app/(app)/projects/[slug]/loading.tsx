export default function Loading() {
  return (
    <>
      <div className="flex flex-col gap-4 px-2.5 pt-10 sm:px-0 animate-pulse w-full max-w-3xl">
        <div className="h-8 w-2/3 bg-foreground/10 rounded-md" />
        <div className="h-4 w-32 bg-foreground/5 rounded-md" />
      </div>

      <div className="flex flex-col-reverse md:grid md:grid-cols-12 md:gap-5 mt-5">
        <main className="flex flex-col justify-start md:col-span-9 animate-pulse w-full max-w-3xl px-2.5 sm:px-0">
          <div className="border-border-color mt-5 flex flex-col items-center justify-center border-t border-dashed pt-5 pb-20">
            <div className="flex w-full max-w-3xl flex-col gap-6">
              <div className="w-full h-8 bg-foreground/10 rounded-md" />
              <div className="w-full h-4 bg-foreground/5 rounded-md" />
              <div className="w-5/6 h-4 bg-foreground/5 rounded-md" />
              <div className="w-11/12 h-4 bg-foreground/5 rounded-md" />

              <div className="w-full h-[400px] bg-foreground/5 rounded-xl border border-dashed border-border-color my-4" />

              <div className="w-3/4 h-8 bg-foreground/10 rounded-md mt-6" />
              <div className="w-full h-4 bg-foreground/5 rounded-md" />
              <div className="w-5/6 h-4 bg-foreground/5 rounded-md" />
              <div className="w-11/12 h-4 bg-foreground/5 rounded-md" />
            </div>
          </div>
        </main>

        <aside className="hidden max-w-3xl md:col-span-3 md:mt-5 md:block animate-pulse">
          <div className="sticky top-24 bg-white p-2 sm:rounded-3xl sm:shadow-sm">
            <div className="flex flex-col gap-4 p-3">
              <div className="w-4/5 h-6 bg-foreground/10 rounded-full" />
              <div className="w-3/5 h-6 bg-foreground/5 rounded-full" />
              <div className="w-2/3 h-6 bg-foreground/5 rounded-full" />
              <div className="w-full h-6 bg-foreground/5 rounded-full" />
              <div className="w-4/5 h-6 bg-foreground/5 rounded-full" />

              <div className="border-border-color my-4 border-b border-dashed"></div>

              <div className="w-16 h-3 bg-foreground/10 rounded mb-1" />
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-foreground/10" />
                <div className="w-8 h-8 rounded-full bg-foreground/10" />
                <div className="w-8 h-8 rounded-full bg-foreground/10" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
