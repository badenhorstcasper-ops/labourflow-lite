import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError, type LoggedError } from "@/lib/errorLogger";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type State = { logged: LoggedError | null };

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { logged: null };

  static getDerivedStateFromError(): State {
    return { logged: { shortId: "…", message: "", route: "" } };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logError(error, { context: { componentStack: info.componentStack?.slice(0, 2000) } }).then(
      (l) => this.setState({ logged: l }),
    );
  }

  copy = async () => {
    const l = this.state.logged;
    if (!l) return;
    const text = `Please fix error ${l.shortId} on ${l.route}: ${l.message}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied — paste into Lovable chat");
    } catch {
      toast.error("Could not copy. Error ID: " + l.shortId);
    }
  };

  render() {
    if (!this.state.logged) return this.props.children;
    const l = this.state.logged;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">
            The error has been logged. You can copy the details below and paste them into
            Lovable chat so it can be fixed quickly.
          </p>
          <div className="rounded bg-muted px-3 py-2 mb-4 text-xs font-mono break-all">
            Error ID: <b>{l.shortId}</b>
            {l.message ? <div className="mt-1 opacity-80">{l.message}</div> : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={this.copy}>Copy for Lovable</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
            <Button variant="ghost" onClick={() => (window.location.href = "/")}>Home</Button>
          </div>
        </div>
      </div>
    );
  }
}
