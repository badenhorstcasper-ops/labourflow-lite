import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  /** Where the Home button goes for signed-out visitors. Defaults to "/". */
  homeTo?: string;
  /** Optional wrapper class (e.g. to control container/padding). */
  className?: string;
};

/**
 * Small navigation bar with Back + Home buttons for pages that are NOT
 * wrapped in AppShell (which already provides these).
 *
 * "Home" does a REAL page load (not an in-app link). The marketing landing
 * page lives in index.html and is only rendered on a fresh load of "/", so an
 * in-app link would keep React mounted and bounce the person straight back to
 * pricing.
 */
export default function BackHomeBar({ homeTo = "/", className = "" }: Props) {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(!!data.session);
    });
    return () => {
      alive = false;
    };
  }, []);
  const clearPendingCheckout = () => {
    try {
      localStorage.removeItem("inreco.pendingPlan");
      localStorage.removeItem("inreco.pendingPayment");
    } catch (_) {}
  };
  // Signed-in people always go "home" to CARA; visitors go to the landing page.
  const target = signedIn ? "/app" : homeTo;
  const goHome = () => {
    if (target === "/") {
      clearPendingCheckout();
      window.location.assign("/");
    }
    else navigate(target);
  };
  const goBack = () => {
    // If we arrived here from a redirect (e.g. "no subscription"), going back
    // would just bounce again — send the person to the landing page instead.
    const cameFromRedirect = window.location.search.includes("reason=");
    if (!cameFromRedirect && window.history.length > 1) navigate(-1);
    else goHome();
  };
  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      <Button variant="ghost" size="sm" onClick={goBack} aria-label="Go back">
        <ArrowLeft className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Back</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={goHome} aria-label={signedIn ? "Home (CARA)" : "Home"}>
        <Home className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Home</span>
      </Button>
    </div>
  );
}
