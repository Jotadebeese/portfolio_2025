import { ArrowRight } from "lucide-react";
import Link from "next/link";

type ButtonToLinkProps = {
  url: string;
  children: React.ReactNode;
  className?: string;
  openInNewTab?: boolean;
};

export default function ButtonToLink({
  url,
  children,
  className,
  openInNewTab,
}: ButtonToLinkProps) {
  return (
    <Link
      href={url}
      target={openInNewTab ? "_blank" : "_self"}
      className={`${className} group flex items-center gap-1 text-sm`}
    >
      <span className="transition-all ease-in-out group-hover:translate-x-1">
        {children}
      </span>
      <ArrowRight
        size={14}
        className={`text-amber-600 transition-all ease-in-out ${openInNewTab ? "-rotate-45 sm:rotate-0 sm:group-hover:-rotate-45" : ""}`}
      />
    </Link>
  );
}
