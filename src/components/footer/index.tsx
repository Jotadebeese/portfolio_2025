"use client";

import { Mail, MessageCircle, X, ChevronsUp, ChevronsDown } from "lucide-react";
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
            "z-1 opacity-40": open,
            "z-[-1] opacity-0": !open,
          },
        )}
      ></div>
      <footer className="pointer-events-none fixed bottom-2 z-50 flex w-full flex-col items-center justify-center px-2">
        <div
          ref={ref}
          className="border-border-color pointer-events-auto relative z-10 flex w-full max-w-md flex-col items-center justify-center rounded-2xl border bg-white p-2 shadow-sm transition-all duration-300 ease-in-out"
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-1 pl-1 items-center justify-start text-xs font-medium opacity-60">
              © {new Date().getFullYear()}
            </div>

            <div className="flex flex-1 items-center justify-center gap-4">
              <Link
                className="transition-opacity hover:opacity-80"
                href={"https://www.linkedin.com/in/jotadebeese/"}
                target="_blank"
              >
                <Image src={linkedIn} alt="LinkedIn" width={18} height={18} />
              </Link>
              <Link
                className="transition-opacity hover:opacity-80"
                href={"mailto:jotadebeese@gmail.com"}
              >
                <Mail size={18} />
              </Link>
              <Link
                className="transition-opacity hover:opacity-80"
                href={"https://github.com/Jotadebeese"}
                target="_blank"
              >
                <Image src={github} alt="GitHub" width={18} height={18} />
              </Link>
            </div>

            <div className="flex flex-1 items-center justify-end">
              <button
                onMouseDown={() => setOpen(!open)}
                className="bg-foreground text-background group relative z-10 flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-lg transition-all duration-300 ease-in-out hover:bg-utils-scent-orange"
              >
                {!open ? (
                  <>
                    <span className="absolute flex h-full w-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
                      <MessageCircle size={18} />
                    </span>
                    <span className="absolute flex h-full w-full translate-y-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                      <ChevronsUp size={18} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="absolute flex h-full w-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
                      <X size={18} />
                    </span>
                    <span className="absolute flex h-full w-full translate-y-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                      <ChevronsDown size={18} />
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className={clsx(
              "grid w-full transition-all duration-300 ease-in-out",
              open ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="flex w-full justify-center overflow-hidden">
              <ContactForm />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
