import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import ReportProblemButton from "@/components/ReportProblemButton";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";


export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status, daysLeft } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, []);

  const linkCls = (p: string) =>
    `shrink-0 px-3 py-1.5 rounded-md text-sm transition ${
      pathname === p
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/app");
  };
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b bg-background/95">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goBack} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <Link to="/app" aria-label="CARA home" className="p-1.5 rounded hover:bg-muted">
              <Home className="h-4 w-4" />
            </Link>
            <Link to="/app" className="font-bold tracking-tight text-lg">iNRECO</Link>
            {status === "trialing" && daysLeft !== null && (
              <Link
                to="/pricing"
                className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                title="Trial in progress"
              >
                Trial: {daysLeft} {daysLeft === 1 ? "day" : "days"} left
              </Link>
            )}
          </div>
          <nav className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap px-1 pb-1 xl:mx-0 xl:justify-end xl:pb-0">
            <Link className={linkCls("/app")} to="/app">CARA</Link>
            <Link className={linkCls("/dashboard")} to="/dashboard">Dashboard</Link>
            <Link className={linkCls("/account-app/generate")} to="/account-app/generate">Generate Docs</Link>
            <Link className={linkCls("/account-app/verify-certificate")} to="/account-app/verify-certificate">Verify Sick Note</Link>
            <Link className={linkCls("/account-app/documents")} to="/account-app/documents">Documents</Link>
            <Link className={linkCls("/account-app/profile")} to="/account-app/profile">Profile</Link>
            <Link className={linkCls("/settings")} to="/settings">Billing</Link>
            {isAdmin && (
              <>
                <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                <Link className={linkCls("/admin/overview")} to="/admin/overview">Owner</Link>
                <Link className={linkCls("/admin/commissions")} to="/admin/commissions">Partners</Link>
                <Link className={linkCls("/admin/marketing")} to="/admin/marketing">Marketing</Link>
                <Link className={linkCls("/admin")} to="/admin">Admin</Link>
              </>
            )}
          </nav>
          </div>

        </div>
      </header>
      <main className="container mx-auto max-w-7xl px-4 py-6 flex-1 pb-10">{children}</main>
      <div className="fixed bottom-10 right-3 z-50">
        <ReportProblemButton />
      </div>
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="px-3 py-1 flex items-center justify-center gap-2 text-[10px] leading-none text-muted-foreground whitespace-nowrap overflow-x-auto">
          <Link to="/terms" className="hover:underline">Terms</Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <span aria-hidden>·</span>
          <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
        </div>
      </footer>
    </div>
  );
}
