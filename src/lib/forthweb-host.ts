export const FORTHWEB_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_FORTHWEB_URL || "https://forthweb.jotadebeese.com"
).replace(/\/$/, "");

export const PORTFOLIO_PUBLIC_URL = (
  process.env.NEXT_WEB_APP_PUBLIC_URL || "https://jotadebeese.com"
).replace(/\/$/, "");

export function isForthwebHost(host: string): boolean {
  const hostname = host.toLowerCase().split(":")[0];
  if (!hostname) return false;
  if (hostname.startsWith("forthweb.")) return true;

  try {
    const configuredHost = new URL(FORTHWEB_PUBLIC_URL).hostname.toLowerCase();
    return hostname === configuredHost;
  } catch {
    return false;
  }
}

export function getForthwebBaseUrl(host?: string | null): string {
  if (host && host.toLowerCase().startsWith("forthweb.localhost")) {
    return `http://${host}`;
  }
  return FORTHWEB_PUBLIC_URL;
}
