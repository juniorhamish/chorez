import crypto from "crypto";

/**
 * Builds a Gravatar image URL for the given email address.
 * Returns null when no email is available (e.g. unassigned tasks).
 */
export function getGravatarUrl(email: string | null | undefined): string | null {
  if (!email) return null;
  const hash = crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}
