"use client";

import React, { useActionState, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
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
    <section className="mx-auto mt-10 w-full max-w-md px-4 sm:mt-16">
      <div className="border-border-color rounded-lg border border-dashed p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="bg-utils-scent-orange/15 text-utils-scent-orange inline-flex h-8 w-8 items-center justify-center rounded-md">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-foreground/60 text-xs tracking-wide uppercase">
              Private Note
            </p>
            <h1 className="text-foreground text-xl font-medium">
              Enter Access Token
            </h1>
          </div>
        </div>

        <p className="text-foreground/75 mb-5 text-sm leading-relaxed">
          This note is unlisted and protected. Paste the access token shared
          with you to view it.
        </p>

        <form action={formAction} className="flex flex-col gap-3">
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
              className="border-border-color text-foreground focus:border-utils-scent-orange w-full rounded-lg border bg-white/70 py-2.5 pr-10 pl-3 font-mono text-sm outline-none transition-colors dark:bg-black/20"
            />
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              className="text-foreground/60 hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer p-1"
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {state?.error && (
            <p className="text-code-rust text-xs font-medium" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="bg-foreground text-background mt-1 inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Verifying..." : "Unlock Note"}
          </button>
        </form>
      </div>
    </section>
  );
}
