import { Mail } from "lucide-react";
import linkedIn from "@/assets/linkedin.svg";
import github from "@/assets/github.svg";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex w-full items-center justify-center gap-2 p-2">
      <Link
        className="hover:opacity-80"
        href={"https://www.linkedin.com/in/jotadebeese/"}
        target="_blank"
      >
        <Image src={linkedIn} alt="LinkedIn" width={14} height={14} />
      </Link>
      <Link className="hover:opacity-80" href={"mailto:jotadebeese@gmail.com"}>
        <Mail size={16} />
      </Link>
      <Link
        className="hover:opacity-80"
        href={"https://github.com/Jotadebeese"}
        target="_blank"
      >
        <Image src={github} alt="GitHub" width={14} height={14} />
      </Link>
    </footer>
  );
}
