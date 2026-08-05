import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft } from "lucide-react";
import ReportProblemButton from "@/components/ReportProblemButton";
import TrialEndingBanner from "@/components/TrialEndingBanner";
import BottomNav from "@/components/BottomNav";

import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

/** Links that live in the "More" sheet instead of crowding the app. */
const moreLinks = [
  { to: "/account-app/verify-certificate", label: "Verify sick note" },
  { to: "/account-app/profile", label: "Company profile" },
  { to: "/account-app/refer", label: "Refer & earn" },
  { to: "/settings", label: "Billing" },
  { to: "/get", label: "Share / install the app" },
];

const adminLinks = [
  { to: "/admin/overview", label: "Owner" },
  { to: "/admin/commissions", label: "Partners" },
  { to: "/admin/marketing", label: "Marketing" },
  { to: "/admin/referrals", label: "Referrals" },
  { to: "/admin", label: "Admin" },
];

const legalLinks = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/disclaimer", label: "Disclaimer" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status, daysLeft } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/app");
  };

  const sheetItem =
    "flex min-h-[56px] items-center rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-muted active:bg-muted";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            aria-label="Go back"
            className="h-11 w-11 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link to="/app" className="truncate text-lg font-bold tracking-tight">
            iNRECO
          </Link>
          {status === "trialing" && daysLeft !== null && (
            <Link
              to="/pricing"
              className="ml-auto inline-flex items-center rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
              title="Trial in progress"
            >
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        <TrialEndingBanner />
        {children}
      </main>

      <div className="fixed bottom-24 right-4 z-50">
        <ReportProblemButton />
      </div>

      <BottomNav onMore={() => setMoreOpen(true)} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-1">
            {moreLinks.map((l) => (
              <Link key={l.to} to={l.to} className={sheetItem}>
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <div className="mt-4 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Owner tools
                </div>
                {adminLinks.map((l) => (
                  <Link key={l.to} to={l.to} className={sheetItem}>
                    {l.label}
                  </Link>
                ))}
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 px-4 pb-2 text-sm text-muted-foreground">
              {legalLinks.map((l) => (
                <Link key={l.to} to={l.to} className="hover:underline">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
