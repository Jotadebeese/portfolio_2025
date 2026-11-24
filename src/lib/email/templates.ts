import { renderBrandEmail, type BrandEmailOptions } from "./layout";

export type ResetPasswordEmailOptions = {
  resetUrl: string;
  userName?: string;
  expiresIn?: string;
};

/**
 * Builds the HTML body for Payload CMS admin password reset emails.
 */
export function buildResetPasswordEmail({
  resetUrl,
  userName,
  expiresIn = "1 hour",
}: ResetPasswordEmailOptions): string {
  return renderBrandEmail({
    badge: "Security",
    previewText: "Reset your Jota Admin password",
    heading: "Reset your password",
    greeting: userName ? `Hi ${userName},` : "Hi,",
    paragraphs: [
      "A password reset was requested for your Jota Admin account.",
      "Click the button below to choose a new password and get back into the CMS.",
    ],
    cta: {
      label: "Reset password",
      href: resetUrl,
    },
    fallbackUrl: resetUrl,
    notice: `This link expires in ${expiresIn}. If you didn't request a password reset, you can safely ignore this email — your password won't change.`,
  });
}

export type NotificationEmailOptions = Omit<BrandEmailOptions, "badge"> & {
  badge?: string;
};

/**
 * Generic on-brand email template for future admin alerts, hooks, or internal notifications.
 */
export function buildNotificationEmail({
  badge = "Notification",
  ...rest
}: NotificationEmailOptions): string {
  return renderBrandEmail({
    badge,
    ...rest,
  });
}
