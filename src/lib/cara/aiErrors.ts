/**
 * Turns a cara-chat / cara-transcribe failure into something a business owner
 * understands, plus a machine-readable kind so the UI can switch to
 * "built-in guidance mode" instead of showing "Edge Function returned a non-2xx".
 */
export type AiErrorKind = "signed_out" | "locked" | "limit" | "unavailable" | "busy" | "unknown";

export type AiErrorInfo = { kind: AiErrorKind; message: string };

const FALLBACK: Record<AiErrorKind, string> = {
  signed_out: "Please sign in to use CARA's AI adviser. The built-in topic guides stay free.",
  locked:
    "Your free week has ended or your plan is not active. The built-in topic guides and templates still work — choose a plan to switch the AI adviser back on.",
  limit: "You've reached the AI-question limit for now. The built-in topic guides still work.",
  unavailable:
    "CARA's AI adviser is temporarily unavailable. The built-in topic guides, checklists and document templates still work — try the AI again later.",
  busy: "CARA's AI adviser is very busy right now. Please try again in a minute.",
  unknown: "I couldn't reach CARA's AI adviser just now. The built-in topic guides below still work.",
};

export function describeAiError(status: number | null, body: unknown): AiErrorInfo {
  const b = (body && typeof body === "object" ? body : {}) as { error?: string; message?: string };
  const code = b.error ?? "";
  let kind: AiErrorKind = "unknown";
  if (status === 401 || code === "not_signed_in") kind = "signed_out";
  else if (status === 402 || code === "not_entitled") kind = "locked";
  else if (code === "monthly_limit" || code === "hourly_limit" || code === "daily_limit") kind = "limit";
  else if (code === "ai_busy") kind = "busy";
  else if (status === 503 || code === "ai_unavailable" || (status !== null && status >= 500)) kind = "unavailable";
  else if (status === 429) kind = "busy";
  const message = typeof b.message === "string" && b.message.trim() ? b.message.trim() : FALLBACK[kind];
  return { kind, message };
}

/** Reads status + JSON body out of a supabase-js FunctionsHttpError (or anything else). */
export async function readFunctionError(error: unknown): Promise<AiErrorInfo> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.status === "number") {
    let body: unknown = null;
    try {
      body = await ctx.clone().json();
    } catch (_) {
      body = null;
    }
    return describeAiError(ctx.status, body);
  }
  return describeAiError(null, null);
}

export const AI_DISCLAIMER =
  "General guidance only, not legal advice. For a dismissal, CCMA matter or anything unusual, confirm with a labour-law practitioner.";

/** Makes sure every AI answer carries the disclaimer exactly once. */
export function withDisclaimer(text: string): string {
  const t = text.trim();
  if (/not legal advice/i.test(t)) return t;
  return `${t}\n\n_${AI_DISCLAIMER}_`;
}
