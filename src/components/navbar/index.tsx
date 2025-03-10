import Link from "next/link";
import NavLink from "./components/nav-link";
import Image from "next/image";
import jota from "@/assets/jota.png";
export default function Navbar() {
  return (
    <div className="fixed flex w-full justify-end pt-2 pr-2">
      <div className="group hover:shadow-foreground rounded-full transition-all ease-in-out hover:shadow-[-4px_-4px]">
        <nav className="border-border-color bg-background hover:shadow-utils-scent-gray-01 hover:border-foreground flex justify-start gap-5 rounded-l-4xl rounded-r-4xl border py-1 pr-3 pl-1 transition-all ease-in-out outline-none hover:shadow-[4px_4px]">
          <Link
            href="/"
            className="group-hover:bg-utils-scent-gray-01 bg-utils-scent-orange flex h-10 w-10 min-w-10 items-center justify-center overflow-hidden rounded-full transition-all ease-in-out"
          >
            <Image src={jota} alt="Jota" width={40} height={40} />
          </Link>
          <ul className="flex items-center justify-center gap-2.5">
            <li>
              <NavLink href="/">Home</NavLink>
            </li>
            <li>
              <NavLink href="/about">About</NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
