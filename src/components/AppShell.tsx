import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ReportProblemButton from "@/components/ReportProblemButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const linkCls = (p: string) =>
    `px-3 py-1.5 rounded-md text-sm transition ${
      pathname === p
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goBack} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <a href="/" className="font-bold tracking-tight text-lg">iNRECO</a>
          </div>
          <nav className="flex items-center gap-1">
            <Link className={linkCls("/dashboard")} to="/dashboard">
              Dashboard
            </Link>
            <Link className={linkCls("/account-app/generate")} to="/account-app/generate">
              Generate
            </Link>
            <Link className={linkCls("/account-app/documents")} to="/account-app/documents">
              Documents
            </Link>
            <Link className={linkCls("/account-app/profile")} to="/account-app/profile">
              Profile
            </Link>
          </nav>
          <Button asChild size="sm">
            <Link to="/dashboard">Open app →</Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-8 flex-1 pb-10">{children}</main>
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
