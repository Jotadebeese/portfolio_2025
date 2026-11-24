import type { PayloadRequest } from "payload";

export {
  BRAND_TOKENS,
  escapeHtml,
  renderBrandEmail,
  type BrandEmailOptions,
  type EmailCta,
  type EmailDetailRow,
} from "./layout";

export {
  buildNotificationEmail,
  buildResetPasswordEmail,
  type NotificationEmailOptions,
  type ResetPasswordEmailOptions,
} from "./templates";

const DEFAULT_ADMIN_BASE_URL = "https://admin.jotadebeese.com";

/**
 * Resolves the public origin for admin links (e.g. password reset URLs) without trailing slashes.
 */
export function resolveAdminBaseUrl(req?: PayloadRequest): string {
  const configuredServerUrl = req?.payload?.config?.serverURL?.trim();
  if (configuredServerUrl) {
    return configuredServerUrl.replace(/\/+$/, "");
  }

  const forwardedHost = req?.headers?.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req?.headers?.get("host")?.trim();

  if (host) {
    const forwardedProto = req?.headers?.get("x-forwarded-proto")?.split(",")[0]?.trim();
    let protocol = forwardedProto;

    if (!protocol && req?.url) {
      try {
        protocol = new URL(req.url).protocol.replace(":", "");
      } catch {
        // Ignore malformed request URLs and fall back below.
      }
    }

    if (!protocol) {
      protocol = host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https";
    }

    return `${protocol}://${host}`;
  }

  return DEFAULT_ADMIN_BASE_URL;
}
