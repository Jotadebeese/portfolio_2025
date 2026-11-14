"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useField, useFormFields } from "@payloadcms/ui";
import { Check, Copy, Link as LinkIcon, RefreshCw } from "lucide-react";

function generateClientToken(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getPublicOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/^(https?:\/\/)admin\./i, "$1");
}

export default function PrivateNoteTokenField({
  path,
  field,
}: {
  path: string;
  field?: { label?: string; admin?: { description?: string } };
}) {
  const { value, setValue } = useField<string>({ path });
  const slug = useFormFields(([fields]) =>
    typeof fields?.slug?.value === "string" ? fields.slug.value : "",
  );
  const visibility = useFormFields(([fields]) =>
    typeof fields?.visibility?.value === "string"
      ? fields.visibility.value
      : "public",
  );

  const [copiedKey, setCopiedKey] = useState<"token" | "link" | "gate" | null>(
    null,
  );

  // Auto-generate a token as soon as the post is switched to private
  useEffect(() => {
    if (visibility === "private" && (!value || !value.trim())) {
      setValue(generateClientToken());
    }
  }, [visibility, value, setValue]);

  const publicBaseUrl = useMemo(() => getPublicOrigin(), []);
  const gateUrl = slug ? `${publicBaseUrl}/notes/p/${slug}` : "";
  const directUrl =
    gateUrl && value ? `${gateUrl}?token=${encodeURIComponent(value)}` : "";

  const copyText = async (
    text: string,
    key: "token" | "link" | "gate",
  ) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  return (
    <div className="cms-editor-reset mb-4 flex flex-col gap-2.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`field-${path}`}
          className="text-foreground font-medium"
        >
          {field?.label || "Access Token"}
        </label>
        <button
          type="button"
          onClick={() => setValue(generateClientToken())}
          className="border-border-color text-foreground/80 hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors"
          title="Regenerate token (invalidates previous links)"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          id={`field-${path}`}
          type="text"
          value={value || ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Auto-generated token"
          spellCheck={false}
          className="border-border-color text-foreground w-full rounded-lg border bg-white/80 px-2.5 py-1.5 font-mono text-xs dark:bg-black/20"
        />
        <button
          type="button"
          onClick={() => copyText(value || "", "token")}
          disabled={!value}
          className="border-border-color text-foreground/80 hover:text-foreground inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40"
          title="Copy token"
        >
          {copiedKey === "token" ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {slug ? (
        <div className="border-border-color flex flex-col gap-2 rounded-lg border border-dashed p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground/70 font-medium">Private URL</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => copyText(gateUrl, "gate")}
                className="border-border-color text-foreground/80 hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors"
                title="Copy URL without token (prompts user to enter token)"
              >
                {copiedKey === "gate" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-3 w-3" />
                    Prompt URL
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => copyText(directUrl, "link")}
                disabled={!directUrl}
                className="border-border-color bg-foreground text-background inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                title="Copy direct link with token included"
              >
                {copiedKey === "link" ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Direct Link
                  </>
                )}
              </button>
            </div>
          </div>
          <code className="text-foreground/70 block truncate font-mono text-[11px]">
            /notes/p/{slug}
            {value ? `?token=${value}` : ""}
          </code>
          <p className="text-foreground/60 m-0 text-[11px] leading-snug">
            Use <strong>Direct Link</strong> for 1-click access, or send{" "}
            <strong>Prompt URL</strong> + token separately. Save/Publish to
            activate changes.
          </p>
        </div>
      ) : (
        <p className="text-foreground/60 m-0 text-xs">
          Set a title or slug to generate the private share URL.
        </p>
      )}
    </div>
  );
}
