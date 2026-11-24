const rawPublicUrl = process.env.NEXT_WEB_APP_PUBLIC_URL?.trim();
const siteUrl =
  rawPublicUrl && rawPublicUrl.startsWith("https://")
    ? rawPublicUrl.replace(/\/+$/, "")
    : "https://jotadebeese.com";

export const BRAND_TOKENS = {
  canvas: "#eeeeee",
  surface: "#ffffff",
  subtleSurface: "#f7f5f3",
  ink: "#181411",
  mutedInk: "#5e5752",
  subtleInk: "#7d756f",
  accent: "#ff9900",
  putty: "#e6d9d1",
  border: "#cecece",
  siteUrl,
  logoUrl: `${siteUrl}/assets/jota.png`,
} as const;

const FONT_BODY =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_HEADING =
  "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";

export type EmailDetailRow = {
  label: string;
  value: string;
};

export type EmailCta = {
  label: string;
  href: string;
};

export type BrandEmailOptions = {
  previewText: string;
  badge?: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  details?: EmailDetailRow[];
  cta?: EmailCta;
  fallbackUrl?: string;
  notice?: string;
  footerNote?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "#";
}

function renderDetailsBlock(details: EmailDetailRow[]): string {
  if (details.length === 0) return "";

  const rows = details
    .map((row, index) => {
      const borderTop =
        index === 0 ? "" : `border-top: 1px dashed ${BRAND_TOKENS.border};`;
      return `
        <tr>
          <td style="padding: 10px 14px; ${borderTop} font-family: ${FONT_BODY}; font-size: 12px; line-height: 18px; color: ${BRAND_TOKENS.subtleInk}; width: 34%; vertical-align: top; text-transform: uppercase; letter-spacing: 0.04em;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding: 10px 14px; ${borderTop} font-family: ${FONT_BODY}; font-size: 14px; line-height: 20px; color: ${BRAND_TOKENS.ink}; font-weight: 500; vertical-align: top; word-break: break-word;">
            ${escapeHtml(row.value)}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 0 0; background-color: ${BRAND_TOKENS.subtleSurface}; border: 1px dashed ${BRAND_TOKENS.border}; border-radius: 12px; border-collapse: separate;">
      ${rows}
    </table>`;
}

function renderCtaBlock(cta: EmailCta): string {
  const safeHref = sanitizeHref(cta.href);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0 0 0;">
      <tr>
        <td align="center" style="border-radius: 9999px; background-color: ${BRAND_TOKENS.ink};">
          <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: ${FONT_BODY}; font-size: 14px; font-weight: 500; line-height: 20px; color: ${BRAND_TOKENS.canvas}; text-decoration: none; border-radius: 9999px; border: 1px solid ${BRAND_TOKENS.ink};">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function renderFallbackUrlBlock(url: string): string {
  const safeHref = sanitizeHref(url);
  return `
    <div style="margin: 18px 0 0 0; padding: 12px 14px; background-color: ${BRAND_TOKENS.subtleSurface}; border: 1px dashed ${BRAND_TOKENS.border}; border-radius: 10px;">
      <p style="margin: 0 0 4px 0; font-family: ${FONT_BODY}; font-size: 12px; line-height: 16px; color: ${BRAND_TOKENS.subtleInk};">
        If the button doesn&rsquo;t work, copy and paste this link:
      </p>
      <p style="margin: 0; font-family: ${FONT_MONO}; font-size: 12px; line-height: 18px; color: ${BRAND_TOKENS.ink}; word-break: break-all;">
        <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color: ${BRAND_TOKENS.ink}; text-decoration: underline;">${escapeHtml(url)}</a>
      </p>
    </div>`;
}

function renderNoticeBlock(notice: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 0 0; background-color: ${BRAND_TOKENS.subtleSurface}; border-left: 3px solid ${BRAND_TOKENS.accent}; border-radius: 0 10px 10px 0;">
      <tr>
        <td style="padding: 12px 14px; font-family: ${FONT_BODY}; font-size: 13px; line-height: 20px; color: ${BRAND_TOKENS.mutedInk};">
          ${escapeHtml(notice)}
        </td>
      </tr>
    </table>`;
}

/**
 * Renders an inline-styled HTML email matching the jotadebeese.com design system.
 */
export function renderBrandEmail(options: BrandEmailOptions): string {
  const {
    previewText,
    badge,
    heading,
    greeting,
    paragraphs,
    details,
    cta,
    fallbackUrl,
    notice,
    footerNote,
  } = options;

  const paragraphsHtml = paragraphs
    .map(
      (text, index) => `
      <p style="margin: ${index === 0 ? "0" : "12px"} 0 0 0; font-family: ${FONT_BODY}; font-size: 15px; line-height: 24px; color: ${BRAND_TOKENS.mutedInk};">
        ${escapeHtml(text)}
      </p>`,
    )
    .join("");

  const badgeHtml = badge
    ? `<span style="display: inline-block; padding: 4px 10px; background-color: ${BRAND_TOKENS.putty}; border: 1px solid ${BRAND_TOKENS.border}; border-radius: 9999px; font-family: ${FONT_BODY}; font-size: 11px; font-weight: 500; line-height: 14px; color: ${BRAND_TOKENS.ink}; text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(badge)}</span>`
    : "";

  const greetingHtml = greeting
    ? `<p style="margin: 0 0 12px 0; font-family: ${FONT_BODY}; font-size: 15px; line-height: 24px; color: ${BRAND_TOKENS.ink}; font-weight: 500;">${escapeHtml(greeting)}</p>`
    : "";

  const footerNoteHtml = footerNote
    ? `<p style="margin: 6px 0 0 0; font-family: ${FONT_BODY}; font-size: 12px; line-height: 18px; color: ${BRAND_TOKENS.subtleInk};">${escapeHtml(footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_TOKENS.canvas}; color: ${BRAND_TOKENS.ink}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
    ${escapeHtml(previewText)}
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND_TOKENS.canvas};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: ${BRAND_TOKENS.surface}; border: 1px solid ${BRAND_TOKENS.border}; border-radius: 16px; overflow: hidden; border-collapse: separate;">
          <tr>
            <td style="padding: 20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <a href="${escapeHtml(BRAND_TOKENS.siteUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; color: ${BRAND_TOKENS.ink};">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <div style="width: 36px; height: 36px; border-radius: 9999px; background-color: ${BRAND_TOKENS.accent}; border: 1px solid ${BRAND_TOKENS.border}; overflow: hidden; text-align: center; line-height: 36px;">
                              <img src="${escapeHtml(BRAND_TOKENS.logoUrl)}" alt="Jota" width="36" height="36" style="display: block; width: 36px; height: 36px; border: 0; object-fit: contain;" />
                            </div>
                          </td>
                          <td style="padding-left: 12px; vertical-align: middle; font-family: ${FONT_HEADING}; font-size: 16px; font-weight: 500; letter-spacing: -0.02em; color: ${BRAND_TOKENS.ink};">
                            jotadebeese.com
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    ${badgeHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px;">
              <div style="border-top: 1px dashed ${BRAND_TOKENS.border}; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h1 style="margin: 0 0 18px 0; font-family: ${FONT_HEADING}; font-size: 24px; font-weight: 400; line-height: 30px; letter-spacing: -0.02em; color: ${BRAND_TOKENS.ink};">
                ${escapeHtml(heading)}
              </h1>
              ${greetingHtml}
              ${paragraphsHtml}
              ${details ? renderDetailsBlock(details) : ""}
              ${cta ? renderCtaBlock(cta) : ""}
              ${fallbackUrl ? renderFallbackUrlBlock(fallbackUrl) : ""}
              ${notice ? renderNoticeBlock(notice) : ""}
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 18px 16px 0 16px; font-family: ${FONT_BODY}; font-size: 12px; line-height: 18px; color: ${BRAND_TOKENS.subtleInk};">
              Sent from Jota Admin &middot;
              <a href="${escapeHtml(BRAND_TOKENS.siteUrl)}" target="_blank" rel="noopener noreferrer" style="color: ${BRAND_TOKENS.mutedInk}; text-decoration: underline;">jotadebeese.com</a>
              ${footerNoteHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
