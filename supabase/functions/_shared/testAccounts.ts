// One list of owner/internal/automated-test accounts, shared by every
// owner/admin metric (signups, recent signups, trial stats, funnels, reminders).
// These accounts are never deleted — they are only left out of the numbers.

export const OWNER_EMAILS: ReadonlySet<string> = new Set([
  "badenhorst.casper@gmail.com",
  "casperbadenhorst77@outlook.com",
]);

export function isTestOrInternalEmail(email?: string | null): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  if (OWNER_EMAILS.has(e)) return true;
  if (e.endsWith("@inrecotest.co.za")) return true;
  const domain = e.split("@").pop() ?? "";
  if (domain === "mailosaur.net" || domain.endsWith(".mailosaur.net")) return true;
  return false;
}
