// Owner/admin-only "is the LIVE app actually working?" page.
// It contacts every behind-the-scenes service and every public page on the
// live site and shows a plain green/red list.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";

type Row = {
  service_name: string;
  label: string;
  status: string;
  http_status: number | null;
  response_ms: number | null;
  detail: string | null;
  checked_at: string;
  triggered_by: string;
  run_id: string;
};

function whenText(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminHealth() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav("/auth?redirect=/admin/health"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!isAdmin) { nav("/"); return; }
      setChecking(false);
    })();
  }, [nav]);

  const loadLatest = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("service_health_checks")
      .select("service_name, label, status, http_status, response_ms, detail, checked_at, triggered_by, run_id")
      .order("checked_at", { ascending: false })
      .limit(200);
    if (err) { setError(err.message); return; }
    const all = (data || []) as Row[];
    if (all.length === 0) { setRows([]); return; }
    const latestRun = all[0].run_id;
    setRows(all.filter((r) => r.run_id === latestRun));
  }, []);

  useEffect(() => {
    if (!checking) void loadLatest();
  }, [checking, loadLatest]);

  const runSweep = async () => {
    setRunning(true);
    setError(null);
    try {
      const { error: err } = await supabase.functions.invoke("live-health-sweep");
      if (err) throw err;
      await loadLatest();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The check could not be completed.");
    } finally {
      setRunning(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const down = rows.filter((r) => r.status !== "up");
  const lastRun = rows[0]?.checked_at;

  return (
    <div className="min-h-screen bg-background">
      <BackHomeBar />
      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Live app health</h1>
          <p className="text-sm text-muted-foreground">
            This checks the real live site your customers use — not the preview. Press the button
            after every publish. Green means that part of the app is answering.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runSweep} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {running ? "Checking the live app…" : "Check live app now"}
          </Button>
          {lastRun && (
            <span className="text-sm text-muted-foreground">Last checked {whenText(lastRun)}</span>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {rows.length > 0 && (
          <Card className={down.length ? "border-destructive/50" : "border-green-500/50"}>
            <CardHeader>
              <CardTitle className="text-lg">
                {down.length === 0
                  ? `All ${rows.length} checks passed — the live app is working.`
                  : `${down.length} of ${rows.length} checks failed — see the red lines below.`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {rows.map((r) => (
                <div
                  key={r.service_name}
                  className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-0"
                >
                  <div className="flex items-start gap-2">
                    {r.status === "up" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">{r.label}</div>
                      {r.detail && (
                        <div className="text-xs text-destructive">{r.detail}</div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.response_ms != null ? `${r.response_ms} ms` : "no answer"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {rows.length === 0 && !running && (
          <p className="text-sm text-muted-foreground">
            No check has been run yet. Press “Check live app now”.
          </p>
        )}
      </main>
    </div>
  );
}
