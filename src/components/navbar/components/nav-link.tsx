"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  dimInactive?: boolean;
};

export default function NavLink({
  href,
  children,
  className,
  dimInactive = true,
}: NavLinkProps) {
  const path = usePathname();
  const isActive = path === href;
  return (
    <Link
      href={href}
      className={clsx(
        "flex text-sm font-medium transition-all ease-in-out hover:text-amber-600",
        dimInactive && !isActive ? "opacity-70 hover:opacity-100" : "opacity-100",
        className,
      )}
    >
      {children}
    </Link>
  );
}
