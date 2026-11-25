"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Copy, RefreshCw, ShieldCheck, KeyRound } from "lucide-react";
import clsx from "clsx";
import ToolButton from "@/components/ui/tool-button";
import HardwareFader from "@/components/ui/hardware-fader";

function generateUuidV7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const now = Date.now();

  const high = Math.floor(now / 0x100000000);
  const low = now >>> 0;

  bytes[0] = (high >>> 8) & 0xff;
  bytes[1] = high & 0xff;
  bytes[2] = (low >>> 24) & 0xff;
  bytes[3] = (low >>> 16) & 0xff;
  bytes[4] = (low >>> 8) & 0xff;
  bytes[5] = low & 0xff;

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function generateHexKey(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generatePassword(length = 20, includeSymbols = true): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";
  const symbols = "!@#$%^&*()-_=+[]{}";
  const charset = lower + upper + numbers + (includeSymbols ? symbols : "");

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((val) => charset[val % charset.length])
    .join("");
}

export default function SecretGenerator() {
  const [uuidV7, setUuidV7] = useState<string>("");
  const [uuidV4, setUuidV4] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordLength, setPasswordLength] = useState<number>(20);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // Generate cryptographic values after mount so SSR and initial hydration stay deterministic
  useEffect(() => {
    setUuidV7(generateUuidV7());
    setUuidV4(crypto.randomUUID());
    setApiKey(`sk_live_${generateHexKey(24)}`);
    setPassword(generatePassword(20, true));
  }, []);

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const regenerateAll = useCallback(() => {
    setIsRotating(true);
    setUuidV7(generateUuidV7());
    setUuidV4(crypto.randomUUID());
    setApiKey(`sk_live_${generateHexKey(24)}`);
    setPassword(generatePassword(passwordLength, includeSymbols));
    setTimeout(() => setIsRotating(false), 500);
  }, [passwordLength, includeSymbols]);

  const toggleSymbols = () => {
    const next = !includeSymbols;
    setIncludeSymbols(next);
    setPassword(generatePassword(passwordLength, next));
  };

  const items = [
    {
      id: "v7",
      title: "UUID v7 (Time-Ordered Database PK)",
      desc: "RFC 9562 standard. Microsecond timestamp prefix optimizes B-Tree indexing.",
      value: uuidV7,
      onRegen: () => setUuidV7(generateUuidV7()),
    },
    {
      id: "v4",
      title: "UUID v4 (Random Standard)",
      desc: "Standard 128-bit cryptographically secure pseudorandom identifier.",
      value: uuidV4,
      onRegen: () => setUuidV4(crypto.randomUUID()),
    },
    {
      id: "apikey",
      title: "API Secret Key (256-bit Entropy)",
      desc: "Ideal for JWT verification secrets, webhook signatures, or API tokens.",
      value: apiKey,
      onRegen: () => setApiKey(`sk_live_${generateHexKey(24)}`),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="text-foreground/80 hidden sm:inline">
            Calculated locally with native{" "}
          </span>
          <code className="text-code-rust bg-code-light-gray border-code-silver rounded-md border px-1.5 py-0.5 font-mono text-[11px]">
            crypto.getRandomValues()
          </code>
        </div>

        <ToolButton variant="secondary" size="sm" onClick={regenerateAll}>
          <RefreshCw
            className={clsx("h-3.5 w-3.5", isRotating && "animate-spin")}
          />
          <span>Regenerate All</span>
        </ToolButton>
      </div>

      <div className="flex flex-col">
        {items.map((item) => (
          <div
            key={item.id}
            className="border-border-color flex flex-col gap-3 border-b border-dashed py-4 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <small>{item.title}</small>
              <span className="bg-background hidden rounded-md px-1.5 py-1 text-xs sm:inline">
                {item.desc}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="border-border-color text-foreground flex-1 overflow-x-auto rounded-md border bg-white px-3 py-2 font-mono text-xs whitespace-nowrap select-all sm:text-sm">
                {item.value}
              </div>

              <ToolButton
                variant="outline"
                size="icon-md"
                onClick={item.onRegen}
                title="Regenerate this key"
                aria-label={`Regenerate ${item.title}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </ToolButton>

              <ToolButton
                variant="outline"
                size="icon-md"
                onClick={() => copyToClipboard(item.value, item.id)}
                title="Copy to clipboard"
                aria-label={`Copy ${item.title}`}
              >
                {copiedKey === item.id ? (
                  <Check className="text-code-green h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </ToolButton>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            <small>
              Password Generator{" "}
              <span className="bg-background rounded-md px-1.5 py-1 font-mono">
                {passwordLength} chars
              </span>
            </small>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={includeSymbols}
              onClick={toggleSymbols}
              className="border-border-color/90 text-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-md border bg-[#f7f5f2] px-2.5 py-1 shadow-[0_1px_0_rgba(24,20,17,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all select-none hover:bg-white active:translate-y-px active:shadow-none"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "size-1.5 shrink-0 rounded-full transition-colors",
                  includeSymbols
                    ? "bg-utils-scent-orange"
                    : "bg-foreground/25",
                )}
              />
              <span>
                Symbols{" "}
                <span className="text-foreground/60 hidden sm:inline">
                  (!@#$)
                </span>
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-foreground/80">Length:</span>
              <HardwareFader
                min={12}
                max={48}
                value={passwordLength}
                onChange={(next) => {
                  setPasswordLength(next);
                  setPassword(generatePassword(next, includeSymbols));
                }}
                ariaLabel="Password length"
                trackWidthClassName="w-24 sm:w-28"
                ticks={7}
                readout={passwordLength}
                readoutClassName="min-w-8"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="border-border-color text-foreground flex-1 overflow-x-auto rounded-md border bg-white px-3 py-2 font-mono text-xs whitespace-nowrap select-all sm:text-sm">
            {password}
          </div>

          <ToolButton
            variant="outline"
            size="icon-md"
            onClick={() =>
              setPassword(generatePassword(passwordLength, includeSymbols))
            }
            title="Regenerate password"
            aria-label="Regenerate password"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </ToolButton>

          <ToolButton
            variant="outline"
            size="icon-md"
            onClick={() => copyToClipboard(password, "password")}
            title="Copy password"
            aria-label="Copy password"
          >
            {copiedKey === "password" ? (
              <Check className="text-code-green h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}
