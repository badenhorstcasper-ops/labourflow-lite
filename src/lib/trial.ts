import { supabase } from "@/integrations/supabase/client";

const PLAN_KEY = "inreco.trialPlan";

/** Remember which plan someone picked before they created their account. */
export function rememberTrialPlan(planName: string) {
  try {
    localStorage.setItem(PLAN_KEY, planName);
  } catch (_) {
    // The trial still works without this, they just default to Solo.
  }
}

export function readTrialPlan(): string | null {
  try {
    return localStorage.getItem(PLAN_KEY);
  } catch (_) {
    return null;
  }
}

export function clearTrialPlan() {
  try {
    localStorage.removeItem(PLAN_KEY);
  } catch (_) {}
}

export type TrialResult = {
  started: boolean;
  alreadyHad?: boolean;
  planName?: string;
  trialEndsAt?: string;
};

/**
 * Switches on the 7-day free trial for the person who is signed in.
 * No card, no PayFast — the account is simply marked as trialing.
 */
export async function startFreeTrial(planName?: string | null): Promise<TrialResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke<TrialResult>("start-trial", {
      body: { planName: planName || readTrialPlan() || "Solo" },
    });
    if (error) return null;
    clearTrialPlan();
    return data ?? null;
  } catch (_) {
    return null;
  }
}
