"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, Eye, EyeOff, Lock } from "lucide-react";
import {
  unlockPrivateNote,
  type UnlockState,
} from "@/app/(app)/notes/p/[slug]/actions";

export default function PrivateNoteGate({ slug }: { slug: string }) {
  const [showToken, setShowToken] = useState(false);
  const boundAction = unlockPrivateNote.bind(null, slug);
  const [state, formAction, isPending] = useActionState<UnlockState, FormData>(
    boundAction,
    {},
  );

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-3 py-10 sm:px-0">
      <div className="border-border-color/50 w-full rounded-xl border bg-white/30 p-1 backdrop-blur-xs">
        <form
          action={formAction}
          className="flex flex-col overflow-hidden rounded-lg bg-white"
        >
          <div className="border-border-color flex items-center justify-between border-b border-dashed px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="bg-utils-scent-orange size-2 rounded-full"
              />
              <small className="text-foreground/70 font-medium">
                Private Note
              </small>
            </div>
            <Lock
              size={13}
              aria-hidden="true"
              className="text-foreground/45"
            />
          </div>

          <div className="flex flex-col gap-4 px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-foreground text-2xl sm:text-3xl">
                Access Token Required
              </h1>
              <p className="text-foreground/70 text-sm font-light">
                This note is unlisted. Enter the token shared with you to read
                it.
              </p>
            </div>

            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                name="token"
                required
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste access token..."
                aria-label="Access token"
                className="border-border-color bg-background/50 text-foreground placeholder:text-foreground/45 focus:border-utils-scent-orange w-full rounded-lg border border-dashed py-2.5 pr-10 pl-3 font-mono text-sm transition-colors focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                className="text-foreground/50 hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-1 transition-colors"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {state?.error && (
              <p className="text-code-rust text-xs font-medium" role="alert">
                {state.error}
              </p>
            )}
          </div>

          <div className="border-border-color flex items-center justify-between gap-3 border-t border-dashed px-5 py-3.5 sm:px-6">
            <Link
              href="/notes"
              className="text-foreground/65 hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Notes</span>
            </Link>

            <button
              type="submit"
              disabled={isPending}
              className="group bg-utils-scent-gray-01/60 border-utils-scent-gray-01 hover:bg-utils-scent-gray-01 text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{isPending ? "Verifying..." : "Unlock Note"}</span>
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="text-amber-600 transition-transform ease-in-out group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
