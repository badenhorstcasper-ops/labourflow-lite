// Helpers for telling "someone opened the installed shortcut" apart from
// "someone is browsing the website in a normal browser tab".

import { isStandalone } from "@/lib/pwaInstall";

/** True when the app was opened from the home-screen shortcut. */
export function isAppLaunch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("app") === "1") return true;
  } catch (_) {
    /* ignore */
  }
  return isStandalone();
}

const DRAFT_KEY = "inreco.guestDraft";

/** Keeps a question someone typed before they had an account. */
export function saveGuestDraft(text: string) {
  try {
    localStorage.setItem(DRAFT_KEY, text);
  } catch (_) {}
}

/** Reads and clears the kept question, so it is only replayed once. */
export function takeGuestDraft(): string | null {
  try {
    const v = localStorage.getItem(DRAFT_KEY);
    if (v) localStorage.removeItem(DRAFT_KEY);
    return v && v.trim() ? v : null;
  } catch (_) {
    return null;
  }
}
