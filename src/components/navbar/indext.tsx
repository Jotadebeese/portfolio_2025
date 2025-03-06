import NavLink from "./components/nav-link";

export default function Navbar() {
  return (
    <div className="fixed w-full flex justify-end pt-2 pr-2">
      <nav className="px-4 py-2 border rounded-lg border-dashed border-border-color">
        <ul className="flex gap-2.5">
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
