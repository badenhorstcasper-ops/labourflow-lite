// Subscriber offers: annual pricing and the one-time "first month 20% off"
// offer for people finishing (or who already finished) a free trial.
// Pure functions — a copy lives in src/lib/offers.ts for the app screens.
// Keep both files identical.

export const MONTHLY_PRICES: Record<string, number> = {
  Solo: 259,
  Business: 599,
  Professional: 1499,
  Enterprise: 3999,
};

/** Paying for a year at once saves this much. */
export const ANNUAL_DISCOUNT = 0.2;
/** First monthly payment discount when subscribing at the end of a trial. */
export const TRIAL_OFFER_DISCOUNT = 0.2;
/** Offer opens this many days before the trial ends... */
export const OFFER_OPENS_DAYS_BEFORE = 2;
/** ...and stays open this many days after it ends. */
export const OFFER_CLOSES_DAYS_AFTER = 7;
/** Trials that ended before this moment get a one-off welcome-back window. */
export const WINBACK_TRIAL_CUTOFF = Date.parse("2026-11-07T00:00:00Z");
export const WINBACK_ENDS = Date.parse("2026-11-21T22:00:00Z"); // 22 Nov 00:00 SAST

export type BillingInterval = "monthly" | "yearly";

export function annualPrice(plan: string): number | null {
  const m = MONTHLY_PRICES[plan];
  if (!m) return null;
  return Math.round(m * 12 * (1 - ANNUAL_DISCOUNT));
}

export function offerFirstMonthPrice(plan: string): number | null {
  const m = MONTHLY_PRICES[plan];
  if (!m) return null;
  return Math.round(m * (1 - TRIAL_OFFER_DISCOUNT));
}

export type OfferKind = "trial_ending" | "win_back";
export type OfferDecision =
  | { eligible: true; kind: OfferKind; endsAt: string }
  | { eligible: false };

const DAY = 24 * 3600 * 1000;

/**
 * Who gets 20% off their first month:
 *  - never made a real (non-zero) payment, and
 *  - had a free trial, and
 *  - it's within 2 days before to 7 days after the trial end, OR
 *    the trial ended before the welcome-back cutoff and that window is still open.
 */
export function decideTrialOffer(input: {
  trialEndsAt: string | null;
  hasPaidBefore: boolean;
  now?: number;
}): OfferDecision {
  const now = input.now ?? Date.now();
  if (input.hasPaidBefore || !input.trialEndsAt) return { eligible: false };
  const end = Date.parse(input.trialEndsAt);
  if (!Number.isFinite(end)) return { eligible: false };

  const opens = end - OFFER_OPENS_DAYS_BEFORE * DAY;
  const closes = end + OFFER_CLOSES_DAYS_AFTER * DAY;
  if (now >= opens && now < closes) {
    return { eligible: true, kind: "trial_ending", endsAt: new Date(closes).toISOString() };
  }
  if (end < WINBACK_TRIAL_CUTOFF && now < WINBACK_ENDS && now >= closes) {
    return { eligible: true, kind: "win_back", endsAt: new Date(WINBACK_ENDS).toISOString() };
  }
  return { eligible: false };
}
