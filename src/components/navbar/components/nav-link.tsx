"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export default function NavLink({ href, children, className }: NavLinkProps) {
  const path = usePathname();
  const isActive = path === href;
  return (
    <Link
      href={href}
      className={clsx(
        "hover:text-utils-scent-orange flex text-xs font-medium opacity-50 transition-all ease-in-out hover:opacity-100",
        className,
        {
          "opacity-100": isActive,
        },
      )}
    >
      {children}
    </Link>
  );
}
