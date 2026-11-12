import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type ButtonToLinkProps = {
  url: string;
  children: React.ReactNode;
  className?: string;
  openInNewTab?: boolean;
  ariaLabel?: string;
};

export default function ButtonToLink({
  url,
  children,
  className,
  openInNewTab,
  ariaLabel,
}: ButtonToLinkProps) {
  const isExternal = Boolean(openInNewTab);

  return (
    <Link
      href={url}
      prefetch={isExternal ? false : undefined}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      className={clsx(
        "group focus-visible:outline-foreground inline-flex min-h-6 items-center gap-1 rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-offset-3",
        className,
      )}
    >
      <span className="transition-all ease-in-out group-hover:translate-x-1 group-focus-visible:translate-x-1">
        {children}
      </span>
      <ArrowRight
        size={14}
        aria-hidden="true"
        className={clsx(
          "text-amber-600 transition-all ease-in-out",
          isExternal &&
            "-rotate-45 sm:rotate-0 sm:group-hover:-rotate-45 sm:group-focus-visible:-rotate-45",
        )}
      />
    </Link>
  );
}
