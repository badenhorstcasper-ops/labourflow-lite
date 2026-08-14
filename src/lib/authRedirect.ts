/**
 * Helpers that remember where someone was heading when we ask them to sign in,
 * so that after signing in they land on that exact page instead of the app home.
 */

/** Builds the sign-in address for a page that needs an account. */
export function signInPath(destination: string) {
  return `/auth?redirect=${encodeURIComponent(destination)}`;
}

/** Reads the remembered destination from the current web address, if it is safe. */
export function readRedirectTarget(search = window.location.search): string | null {
  const raw = new URLSearchParams(search).get("redirect");
  if (!raw) return null;
  // Only allow addresses inside this app (never an outside website).
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}
