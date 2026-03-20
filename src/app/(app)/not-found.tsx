import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-7xl md:text-[10rem]">404</h1>
      <p className="text-foreground mb-8">
        We couldn't find the page you were looking for.
      </p>
      <div className="group flex items-center gap-2">
        <ChevronLeft size={16} />
        <Link
          href="/"
          className="bg-utils-scent-gray-01/60 border-utils-scent-gray-01 text-foreground hover:bg-utils-scent-gray-01 rounded-lg border px-6 py-2 transition-all group-hover:-translate-x-1"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}
