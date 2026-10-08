/** Remembers (on this device) that someone has finished or skipped the welcome setup. */
const key = (userId: string) => `inreco.onboarding.done.${userId}`;

export function isOnboarded(userId: string) {
  try { return localStorage.getItem(key(userId)) === "1"; } catch { return true; }
}

export function markOnboarded(userId: string) {
  try { localStorage.setItem(key(userId), "1"); } catch { /* ignore */ }
}
