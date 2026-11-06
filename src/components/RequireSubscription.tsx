import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import GuestPreview from "@/pages/GuestPreview";
import { signInPath } from "@/lib/authRedirect";
import { startFreeTrial } from "@/lib/trial";
import { trackStep } from "@/lib/funnel";

/** Where to send someone who is signed in but not entitled, and why. */
export function lockedReasonFor(reason: string, status: string): string {
  if (reason === "provisional_expired" || status === "pending") return "payment_processing";
  if (status === "cancelled") return "subscription_cancelled";
  if (reason === "no_subscription") return "no_subscription";
  return "trial_ended";
}

export default function RequireSubscription({
  children,
  allowGuestPreview = false,
}: {
  children: React.ReactNode;
  /** When true, a visitor without an account sees a try-it screen instead of being bounced. */
  allowGuestPreview?: boolean;
}) {
  const { loading, authed, isEntitled, status, entitlementReason, refresh } = useSubscription();
  const location = useLocation();
  const [autoTrial, setAutoTrial] = useState<"idle" | "starting" | "failed">("idle");
  const tried = useRef(false);

  // Funnel fix (Nov 2026): a brand-new account with NO subscription row used to
  // be bounced to /pricing and asked to pick a plan before ever seeing the app.
  // The site promises "7 days free, no card", so we simply switch the free week
  // on (start-trial still enforces one trial per person/email on the server).
  const needsAutoTrial = !loading && authed && !isEntitled && entitlementReason === "no_subscription";
  useEffect(() => {
    if (!needsAutoTrial || tried.current) return;
    tried.current = true;
    setAutoTrial("starting");
    (async () => {
      const res = await startFreeTrial();
      if (res) {
        // started -> free week is on; alreadyHad -> an older record was linked
        // to this account, and the normal "trial ended" path applies.
        if (res.started) void trackStep(location.pathname, "trial_auto_started");
        await refresh();
        setAutoTrial("idle");
      } else {
        setAutoTrial("failed");
      }
    })();
  }, [needsAutoTrial, refresh, location.pathname]);

  if (loading || autoTrial === "starting") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        {autoTrial === "starting" ? "Switching on your free week…" : "Loading…"}
      </div>
    );
  }

  if (!authed) {
    if (allowGuestPreview) return <GuestPreview />;
    return <Navigate to={signInPath(location.pathname + location.search)} replace />;
  }

  if (!isEntitled) {
    const reason = lockedReasonFor(entitlementReason, status);
    return <Navigate to={`/pricing?reason=${reason}`} replace />;
  }

  return <>{children}</>;
}
