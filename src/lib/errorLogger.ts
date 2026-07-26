// Centralised error logger. Captures uncaught errors + promise rejections,
// writes them to the `error_logs` table in Lovable Cloud, and exposes a tiny
// API so React components (and the legacy vanilla app in index.html) can
// report problems with one call.

import { supabase } from "@/integrations/supabase/client";

export type LoggedError = {
  shortId: string;
  message: string;
  stack?: string;
  route: string;
};

const recent: LoggedError[] = [];
const MAX_RECENT = 10;

function pushRecent(e: LoggedError) {
  recent.unshift(e);
  if (recent.length > MAX_RECENT) recent.pop();
  try {
    sessionStorage.setItem("lf:lastError", JSON.stringify(e));
  } catch {
    /* ignore */
  }
}

export function getRecentErrors(): LoggedError[] {
  return recent.slice();
}

export function getLastError(): LoggedError | null {
  if (recent[0]) return recent[0];
  try {
    const raw = sessionStorage.getItem("lf:lastError");
    return raw ? (JSON.parse(raw) as LoggedError) : null;
  } catch {
    return null;
  }
}

function shortId() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();
}

let inFlight = 0;

export async function logError(
  err: unknown,
  ctx?: { severity?: "error" | "warning" | "info"; context?: Record<string, unknown> },
): Promise<LoggedError> {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
  const route = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  // Local fallback first — we never want logging to throw.
  const local: LoggedError = {
    shortId: shortId(),
    message: e.message.slice(0, 1000),
    stack: (e.stack || "").slice(0, 4000),
    route,
  };
  pushRecent(local);

  // Best-effort remote write.
  if (inFlight > 4) return local; // throttle
  inFlight++;
  try {
    // Who reported this is filled in by the database from the signed-in
    // session, so we deliberately do not send an account id or email here.
    const { data, error } = await supabase
      .from("error_logs")
      .insert({
        route,
        message: local.message,
        stack: local.stack,
        user_agent: ua,
        severity: ctx?.severity ?? "error",
        context: (ctx?.context ?? null) as never,
      })
      .select("short_id")
      .single();

    if (!error && data?.short_id) {
      local.shortId = data.short_id as string;
      // Update the cached copy with server short_id
      recent[0] = local;
      try { sessionStorage.setItem("lf:lastError", JSON.stringify(local)); } catch { /* ignore */ }
    }
    // eslint-disable-next-line no-console
    console.warn("[errorLogger]", local.shortId, local.message);
  } catch (writeErr) {
    // eslint-disable-next-line no-console
    console.warn("[errorLogger] write failed", writeErr);
  } finally {
    inFlight--;
  }
  return local;
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (ev) => {
    // Ignore ResizeObserver loop spam.
    if (ev.message && /ResizeObserver loop/.test(ev.message)) return;
    void logError(ev.error ?? ev.message ?? "Unknown error", {
      context: {
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    void logError(ev.reason ?? "Unhandled promise rejection");
  });

  // Expose for the legacy vanilla app in index.html.
  (window as unknown as { iNRECO?: Record<string, unknown> }).iNRECO ??= {};
  ((window as unknown as { iNRECO: Record<string, unknown> }).iNRECO).logError = logError;
  ((window as unknown as { iNRECO: Record<string, unknown> }).iNRECO).getLastError = getLastError;
}
