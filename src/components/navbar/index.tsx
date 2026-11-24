import Link from "next/link";
import NavLink from "./components/nav-link";
import Image from "next/image";
import jota from "@/assets/jota.png";

export default function Navbar() {
  return (
    <header className="flex w-full justify-center">
      <div className="flex w-full max-w-6xl items-center justify-between gap-3 px-2.5 py-4 sm:px-5">
        <Link
          href="/"
          className="group focus-visible:outline-foreground flex items-center gap-2 rounded-full transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="bg-utils-scent-orange group-hover:bg-utils-scent-gray-01 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors duration-300">
            <Image src={jota} alt="Juan Bedoya" width={28} height={28} />
          </span>
          <span className="text-foreground text-sm tracking-tight">
            Juan Bedoya
          </span>
        </Link>

        <nav aria-label="Primary navigation">
          <NavLink
            dimInactive={false}
            className="text-code-green rounded-full hover:text-amber-700"
            href="/notes"
          >
            #self.log()
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
