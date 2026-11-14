import crypto from "crypto";

function getSigningSecret(): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    throw new Error("PAYLOAD_SECRET is required to sign private note cookies.");
  }
  return secret;
}

function sha256(input: string): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

/**
 * Constant-time token comparison using fixed-length SHA-256 digests.
 */
export function verifyPrivateNoteToken(
  expectedToken: string | null | undefined,
  providedToken: string | null | undefined,
): boolean {
  if (!expectedToken || !providedToken) return false;
  const trimmedExpected = expectedToken.trim();
  const trimmedProvided = providedToken.trim();
  if (!trimmedExpected || !trimmedProvided) return false;
  return crypto.timingSafeEqual(
    sha256(trimmedExpected),
    sha256(trimmedProvided),
  );
}

/**
 * Cookie name scoped per slug so unlocking one private note does not unlock others.
 */
export function getPrivateNoteCookieName(slug: string): string {
  const slugHash = crypto
    .createHash("sha256")
    .update(slug)
    .digest("hex")
    .slice(0, 16);
  return `pn_access_${slugHash}`;
}

export function signPrivateNoteCookie(slug: string, accessToken: string): string {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(`${slug}:${accessToken}`)
    .digest("hex");
}

export function verifyPrivateNoteCookie(
  slug: string,
  accessToken: string | null | undefined,
  cookieValue: string | null | undefined,
): boolean {
  if (!accessToken || !cookieValue) return false;
  const expected = signPrivateNoteCookie(slug, accessToken);
  return crypto.timingSafeEqual(sha256(expected), sha256(cookieValue));
}
