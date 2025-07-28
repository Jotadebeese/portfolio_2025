import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full pt-5 sm:px-5">
      <Link
        href={"/"}
        className="text-foreground absolute z-50 flex cursor-pointer items-center gap-1 self-baseline px-2.5 transition-all ease-in-out sm:px-0"
      >
        <ChevronLeft size={14} />
        <small>Back to Home</small>
      </Link>
      {children}
    </div>
  );
}
