"use client";

import { Mail } from "lucide-react";
import linkedIn from "@/assets/linkedin.svg";
import github from "@/assets/github.svg";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "../forms/components/contact-form";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export default function Footer() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <>
      <div
        className={clsx(
          "bg-foreground fixed top-0 h-dvh w-full transition-all ease-in-out",
          {
            "z-1 opacity-25": open,
            "z-[-1] opacity-0": !open,
          },
        )}
      ></div>
      <footer
        className={clsx(
          "fixed bottom-0 z-10 flex w-full flex-col items-center justify-center transition-all duration-300 ease-in-out sm:px-5",
          { "translate-y-0": open, "translate-y-[calc(100%-54px)]": !open },
        )}
      >
        <div className="flex w-full max-w-3xl items-end justify-end pr-6">
          <button
            onMouseDown={() => setOpen(!open)}
            className="bg-foreground text-background z-1 w-20 translate-y-0.5 cursor-pointer rounded-t-xl px-2 pt-0.5 pb-1 text-xs shadow-md transition-all ease-in-out hover:translate-y-0"
          >
            {!open ? "contact" : "x"}
          </button>
        </div>
        <div
          ref={ref}
          className="border-border-color z-10 flex w-full max-w-3xl flex-col items-center justify-center gap-2 rounded-t-2xl border bg-white p-2 shadow-md"
        >
          <div className="flex items-center justify-center gap-2">
            <Link
              className="hover:opacity-80"
              href={"https://www.linkedin.com/in/jotadebeese/"}
              target="_blank"
            >
              <Image src={linkedIn} alt="LinkedIn" width={14} height={14} />
            </Link>
            <Link
              className="hover:opacity-80"
              href={"mailto:jotadebeese@gmail.com"}
            >
              <Mail size={16} />
            </Link>
            <Link
              className="hover:opacity-80"
              href={"https://github.com/Jotadebeese"}
              target="_blank"
            >
              <Image src={github} alt="GitHub" width={14} height={14} />
            </Link>
          </div>
          <ContactForm />
        </div>
      </footer>
    </>
  );
}
