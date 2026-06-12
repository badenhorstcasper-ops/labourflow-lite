import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import ReportProblemButton from "@/components/ReportProblemButton";
import { useSubscription } from "@/hooks/useSubscription";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status, daysLeft } = useSubscription();
  const linkCls = (p: string) =>
    `px-3 py-1.5 rounded-md text-sm transition ${
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
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
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
          <nav className="flex items-center gap-1 flex-wrap">
            <Link className={linkCls("/app")} to="/app">CARA</Link>
            <Link className={linkCls("/dashboard")} to="/dashboard">Dashboard</Link>
            <Link className={linkCls("/account-app/generate")} to="/account-app/generate">Generate Docs</Link>
            <Link className={linkCls("/account-app/documents")} to="/account-app/documents">Documents</Link>
            <Link className={linkCls("/account-app/profile")} to="/account-app/profile">Profile</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-6 flex-1 pb-10">{children}</main>
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
