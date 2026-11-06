/**
 * Single source of truth for "may this account use the product right now?"
 * and "may this account spend another AI question?".
 *
 * PURE TypeScript (no Deno / browser imports) so it runs in three places:
 *   - edge functions (cara-chat, cara-transcribe)  -> real server-side gate
 *   - the React app (src/lib/entitlement.ts re-exports it) -> UI paywall
 *   - vitest (src/test/entitlement.test.ts)
 *
 * Owner decisions (Casper) are the constants at the top. Change them here only.
 */

export type SubRow = {
  status?: string | null;
  plan_name?: string | null;
  trial_ends_at?: string | null;
  paid_until?: string | null;
  provisional_until?: string | null;
};

export type EntitlementReason =
  | "admin"
  | "paid"
  | "active"
  | "trial"
  | "provisional"
  | "no_subscription"
  | "trial_ended"
  | "provisional_expired"
  | "cancelled"
  | "pending"
  | "expired";

export type Entitlement = { entitled: boolean; reason: EntitlementReason };

const t = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN);

export function computeEntitlement(
  sub: SubRow | null | undefined,
  opts: { isAdmin?: boolean; now?: number } = {},
): Entitlement {
  const now = opts.now ?? Date.now();
  if (opts.isAdmin) return { entitled: true, reason: "admin" };
  if (!sub) return { entitled: false, reason: "no_subscription" };

  // A month already paid for always counts, even if a renewal ITN is late.
  if (t(sub.paid_until) > now) return { entitled: true, reason: "paid" };

  // Provisional access (PayFast redirect arrived, ITN not yet) is time-boxed.
  const prov = t(sub.provisional_until);
  if (!Number.isNaN(prov)) {
    if (prov <= now) return { entitled: false, reason: "provisional_expired" };
  }

  const status = (sub.status || "none").toLowerCase();
  if (status === "active") {
    // Legacy active rows without paid_until stay entitled (pre-paid_until era).
    if (!sub.paid_until) {
      return { entitled: true, reason: !Number.isNaN(prov) ? "provisional" : "active" };
    }
    return { entitled: false, reason: "expired" };
  }
  if (status === "trialing") {
    const ends = t(sub.trial_ends_at);
    if (!Number.isNaN(ends) && ends > now) {
      return { entitled: true, reason: !Number.isNaN(prov) ? "provisional" : "trial" };
    }
    return { entitled: false, reason: "trial_ended" };
  }
  if (status === "cancelled") return { entitled: false, reason: "cancelled" };
  if (status === "pending") return { entitled: false, reason: "pending" };
  if (status === "expired") return { entitled: false, reason: "trial_ended" };
  return { entitled: false, reason: "no_subscription" };
}

/* ------------------------------------------------------------------ *
 * AI spend guard
 * ------------------------------------------------------------------ */

/**
 * Monthly AI-question allowance per plan (per account, team members share it).
 * null = no monthly cap (only the fair-use rate limits below apply).
 * Solo's 50 matches what the site already advertises.
 * DECISION FOR CASPER: confirm or change these numbers.
 */
export const AI_MONTHLY_LIMITS: Record<string, number | null> = {
  Solo: 50,
  Business: null,
  Professional: null,
  Enterprise: null,
};

/** Fair-use guards that protect the AI bill from abuse on every plan. */
export const AI_HOURLY_LIMIT_PER_USER = 20;
export const AI_DAILY_LIMIT_PER_USER = 80;
/** Voice notes are cheaper but still metered. */
export const TRANSCRIBE_HOURLY_LIMIT_PER_USER = 20;

export type AiKind = "chat" | "transcribe";

export type AiDecision =
  | { allowed: true; remainingThisMonth: number | null }
  | {
      allowed: false;
      reason: "not_entitled" | "monthly_limit" | "hourly_limit" | "daily_limit";
      limit?: number;
    };

export function decideAiAccess(input: {
  entitlement: Entitlement;
  planName: string | null | undefined;
  kind: AiKind;
  usedThisMonthByAccount: number;
  usedLastHourByUser: number;
  usedLastDayByUser: number;
}): AiDecision {
  const { entitlement, kind } = input;
  if (!entitlement.entitled) return { allowed: false, reason: "not_entitled" };
  const isAdmin = entitlement.reason === "admin";

  if (kind === "transcribe") {
    if (!isAdmin && input.usedLastHourByUser >= TRANSCRIBE_HOURLY_LIMIT_PER_USER) {
      return { allowed: false, reason: "hourly_limit", limit: TRANSCRIBE_HOURLY_LIMIT_PER_USER };
    }
    return { allowed: true, remainingThisMonth: null };
  }

  if (!isAdmin) {
    if (input.usedLastHourByUser >= AI_HOURLY_LIMIT_PER_USER) {
      return { allowed: false, reason: "hourly_limit", limit: AI_HOURLY_LIMIT_PER_USER };
    }
    if (input.usedLastDayByUser >= AI_DAILY_LIMIT_PER_USER) {
      return { allowed: false, reason: "daily_limit", limit: AI_DAILY_LIMIT_PER_USER };
    }
  }
  const plan = input.planName || "Solo";
  const monthly = isAdmin ? null : (plan in AI_MONTHLY_LIMITS ? AI_MONTHLY_LIMITS[plan] : AI_MONTHLY_LIMITS.Solo);
  if (monthly !== null && monthly !== undefined) {
    if (input.usedThisMonthByAccount >= monthly) {
      return { allowed: false, reason: "monthly_limit", limit: monthly };
    }
    return { allowed: true, remainingThisMonth: monthly - input.usedThisMonthByAccount - 1 };
  }
  return { allowed: true, remainingThisMonth: null };
}

/** Start of the current calendar month in South Africa (UTC+2), as ISO UTC. */
export function startOfMonthSAST(now = Date.now()): string {
  const sast = new Date(now + 2 * 3600 * 1000);
  const start = Date.UTC(sast.getUTCFullYear(), sast.getUTCMonth(), 1) - 2 * 3600 * 1000;
  return new Date(start).toISOString();
}

/* ------------------------------------------------------------------ *
 * Provisional-access rules (PayFast redirect safety net)
 * ------------------------------------------------------------------ */

export const PROVISIONAL_HOURS = 48;
/** One provisional grant per account/email per 30 days unless a payment completed. */
export const PROVISIONAL_COOLDOWN_DAYS = 30;

export function decideProvisional(input: {
  payMode: string | null | undefined;
  txStatus: string | null | undefined;
  /** Any earlier subscription row for this user/email (trial or paid). */
  hadSubscriptionBefore: boolean;
  /** Most recent provisional grant for this user/email that never completed. */
  lastUnconfirmedGrantAt: string | null;
  now?: number;
}): { grant: boolean; reason: string } {
  const now = input.now ?? Date.now();
  if (input.txStatus === "complete") return { grant: true, reason: "confirmed" };
  if (input.txStatus === "cancelled" || input.txStatus === "failed") {
    return { grant: false, reason: input.txStatus };
  }
  // Card-free trials are started by start-trial (one per email). A PayFast
  // trial-mode checkout must never mint a second free week by itself.
  if ((input.payMode || "trial") !== "now") {
    if (input.hadSubscriptionBefore) return { grant: false, reason: "trial_already_used" };
  }
  if (input.lastUnconfirmedGrantAt) {
    const last = new Date(input.lastUnconfirmedGrantAt).getTime();
    if (now - last < PROVISIONAL_COOLDOWN_DAYS * 86400000) {
      return { grant: false, reason: "provisional_recently_used" };
    }
  }
  return { grant: true, reason: "provisional" };
}
