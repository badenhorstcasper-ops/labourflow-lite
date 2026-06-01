import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ReportProblemButton from "@/components/ReportProblemButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const linkCls = (p: string) =>
    `px-3 py-1.5 rounded-md text-sm transition ${
      pathname === p
        ? "bg-primary text-primary-foreground"
        : "text-foreground hover:bg-muted"
    }`;
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <a href="/" className="font-bold tracking-tight text-lg">iNRECO</a>
          <nav className="flex items-center gap-1">
            <Link className={linkCls("/account-app/profile")} to="/account-app/profile">
              Company profile
            </Link>
            <Link className={linkCls("/account-app/documents")} to="/account-app/documents">
              Documents
            </Link>
          </nav>
          <Button asChild variant="outline" size="sm">
            <a href="/">Back to app</a>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-8 flex-1">{children}</main>
      <footer className="border-t">
        <div className="container mx-auto max-w-5xl px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} iNRECO</span>
          <nav className="flex items-center gap-3 whitespace-nowrap">
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span aria-hidden>·</span>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <span aria-hidden>·</span>
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
          </nav>
          <ReportProblemButton />
        </div>
      </footer>
    </div>
  );
}
