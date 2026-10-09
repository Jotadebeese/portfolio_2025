"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const CLOUDFLARE_TEST_SITE_KEY = "1x00000000000000000000AA";

interface TurnstileProps {
  siteKey?: string;
  theme?: "auto" | "light" | "dark";
  onSuccess?: (token: string) => void;
  onError?: (error?: unknown) => void;
  onExpire?: () => void;
  resetTrigger?: unknown;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          action?: string;
          cData?: string;
          callback?: (token: string) => void;
          "error-callback"?: (error?: unknown) => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "compact" | "flexible";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
  }
}

export default function Turnstile({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    CLOUDFLARE_TEST_SITE_KEY,
  theme = "auto",
  onSuccess,
  onError,
  onExpire,
  resetTrigger,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string>("");

  const renderWidget = () => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
      return;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        action: "contact_form",
        size: "flexible",
        callback: (receivedToken: string) => {
          setToken(receivedToken);
          onSuccess?.(receivedToken);
        },
        "error-callback": (err: unknown) => {
          console.error("Turnstile error:", err);
          setToken("");
          onError?.(err);
        },
        "expired-callback": () => {
          setToken("");
          onExpire?.();
        },
      });
    } catch (err) {
      console.error("Failed to render Turnstile widget:", err);
    }
  };

  useEffect(() => {
    if (window.turnstile && containerRef.current && !widgetIdRef.current) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme]);

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setToken("");
    }
  }, [resetTrigger]);

  return (
    <div className="w-full">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div ref={containerRef} className="my-1 min-h-[65px] w-full" />
    </div>
  );
}
