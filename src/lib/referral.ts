import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device";

/** Where we remember an invite code between landing on the site and signing up. */
const INVITE_KEY = "inreco.invite";
const INVITE_CODE_RE = /^RE-[A-Z0-9]{4,10}$/;

/** Reward paid to the referrer once their friend starts paying. */
export const REFERRAL_REWARDS: Record<string, number> = {
  Solo: 50,
  Business: 100,
  Professional: 150,
  Enterprise: 250,
};

export function readStoredInvite(): string | null {
  try {
    const v = localStorage.getItem(INVITE_KEY);
    return v && INVITE_CODE_RE.test(v) ? v : null;
  } catch (_) {
    return null;
  }
}

/** Pick up ?invite=RE-XXXXXX from the address bar and keep it for later. */
export function captureInviteFromUrl(search: string) {
  try {
    const code = (new URLSearchParams(search).get("invite") || "").trim().toUpperCase();
    if (code && INVITE_CODE_RE.test(code)) {
      localStorage.setItem(INVITE_KEY, code);
    }
  } catch (_) {
    /* ignore */
  }
}

export function clearStoredInvite() {
  try {
    localStorage.removeItem(INVITE_KEY);
  } catch (_) {
    /* ignore */
  }
}

/**
 * Ties a freshly signed-in account to the invite link it arrived from.
 * Safe to call repeatedly — the server only records the first valid one.
 */
export async function attachInviteIfAny(): Promise<void> {
  const code = readStoredInvite();
  if (!code) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  try {
    const { data } = await supabase.functions.invoke("referral-attach", {
      body: { code, deviceId: getDeviceId() },
    });
    const result = data as { ok?: boolean; final?: boolean } | null;
    if (result?.ok || result?.final) clearStoredInvite();
  } catch (_) {
    /* try again next load */
  }
}

export function inviteLinkFor(code: string) {
  const base =
    typeof window !== "undefined" && window.location.hostname.endsWith("inreco.co.za")
      ? window.location.origin
      : "https://app.inreco.co.za";
  return `${base}/get?invite=${encodeURIComponent(code)}`;
}

export function inviteShareText(link: string) {
  return `I use iNRECO Pocket Consultant for South African labour advice and HR documents. Use my link and you get a 14-day free trial instead of 7: ${link}`;
}
