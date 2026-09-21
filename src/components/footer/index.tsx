"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, MessageCircle, X, ChevronsUp, ChevronsDown } from "lucide-react";
import linkedIn from "@/assets/linkedin.svg";
import github from "@/assets/github.svg";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "../forms/components/contact-form";
import clsx from "clsx";

export default function Footer() {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={clsx(
          "bg-foreground/25 fixed inset-0 z-40 backdrop-blur-[1px] transition-opacity duration-300 ease-in-out",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <footer className="relative z-50 flex w-full justify-center">
        <div className="flex w-full max-w-6xl justify-center px-2.5 sm:px-5">
          <div className="border-border-color relative grid w-full grid-cols-3 items-center border-t border-dashed py-4">
            <div
              ref={cardRef}
              className={clsx(
                "border-border-color absolute right-0 bottom-full z-50 mb-3 flex max-h-[80vh] w-full max-w-md origin-bottom-right flex-col overflow-y-auto rounded-2xl border bg-white p-2 shadow-lg transition-all duration-300 ease-out",
                open
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none translate-y-4 scale-98 opacity-0",
              )}
            >
              <ContactForm />
            </div>

            <div className="flex justify-start">
              <span className="text-xs">© {new Date().getFullYear()}</span>
            </div>

            <div className="flex justify-center">
              <div className="flex items-center gap-4">
                <Link
                  className="transition-opacity hover:opacity-80"
                  href="https://www.linkedin.com/in/jotadebeese/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Juan Bedoya on LinkedIn"
                >
                  <Image src={linkedIn} alt="LinkedIn" width={16} height={16} />
                </Link>
                <Link
                  className="transition-opacity hover:opacity-80"
                  href="mailto:jotadebeese@gmail.com"
                  aria-label="Send Juan an email"
                >
                  <Mail size={16} />
                </Link>
                <Link
                  className="transition-opacity hover:opacity-80"
                  href="https://github.com/Jotadebeese"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Juan Bedoya on GitHub"
                >
                  <Image src={github} alt="GitHub" width={16} height={16} />
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <span className="hidden text-sm sm:inline">send message</span>
              <button
                ref={buttonRef}
                onClick={() => setOpen(!open)}
                aria-label={open ? "Close contact form" : "Open contact form"}
                className="bg-foreground text-background group hover:bg-utils-scent-orange relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-lg transition-all duration-300 ease-in-out"
              >
                {!open ? (
                  <>
                    <span className="absolute flex h-full w-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
                      <MessageCircle size={16} />
                    </span>
                    <span className="absolute flex h-full w-full translate-y-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                      <ChevronsUp size={16} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="absolute flex h-full w-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
                      <X size={16} />
                    </span>
                    <span className="absolute flex h-full w-full translate-y-full items-center justify-center transition-transform duration-300 ease-in-out group-hover:translate-y-0">
                      <ChevronsDown size={16} />
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
