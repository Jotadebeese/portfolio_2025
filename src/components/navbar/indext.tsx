import Link from "next/link";
import NavLink from "./components/nav-link";
import Image from "next/image";
import jota from "@/assets/jota.png";
export default function Navbar() {
  return (
    <div className="fixed flex w-full justify-end pt-2 pr-2">
      <nav className="border-border-color flex justify-start gap-5 rounded-l-4xl rounded-r-4xl border border-dashed py-1 pr-3 pl-1">
        <Link
          href="/"
          className="bg-utils-scent-orange flex h-8 w-8 min-w-8 items-center justify-center overflow-hidden rounded-full"
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
  );
}
