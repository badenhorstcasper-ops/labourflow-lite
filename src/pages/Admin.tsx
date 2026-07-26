import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Home } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";
import { useLiveData } from "@/hooks/useLiveData";
import LiveStatus from "@/components/LiveStatus";
import LiveHealthBanner from "@/components/LiveHealthBanner";


type ErrorRow = {
  id: string;
  short_id: string | null;
  message: string | null;
  route: string | null;
  severity: string | null;
  created_at: string;
  email: string | null;
};

type Stats = {
  totals: {
    signups: number;
    signupsDemo: number;
    signupsReal: number;
    documents: number;
    payments: number;
    paymentsRejected: number;
    bookings: number;
    contacts: number;
    activeSubscriptions: number;
  };
  signups: { week: number; month: number };
  pageViews: { day: number; week: number; month: number };
  topPaths: { path: string; count: number }[];
  recentSignups: { id: string; email: string; created_at: string }[];
  recentDocuments: { id: string; doc_type: string; created_at: string }[];
  recentErrors: ErrorRow[];
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!isAdmin) { navigate("/"); return; }
      setAuthorized(true);
      setChecking(false);
    })();
  }, [navigate]);

  const { data: stats, error, refreshing, updatedAt, refresh } = useLiveData<Stats>(async () => {
    const { data, error } = await supabase.functions.invoke("admin-stats");
    if (error) throw new Error(error.message);
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Stats;
  }, 30_000);

  async function resolveError(id: string) {
    const { error } = await supabase.functions.invoke("resolve-error", { body: { id } });
    if (error) return;
    refresh();
  }

  if (checking || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackHomeBar homeTo="/app" />
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">Live usage across the app</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/app"><Button variant="outline" aria-label="Home"><Home className="h-4 w-4" /></Button></a>
          <a href="/admin/overview"><Button variant="outline">Owner overview →</Button></a>
          <a href="/admin/commissions"><Button variant="outline">Commissions →</Button></a>
          <a href="/admin/marketing"><Button variant="outline">Marketing →</Button></a>
          <a href="/admin/health"><Button variant="outline">Live app health →</Button></a>
        </div>
      </div>
      <LiveHealthBanner />
      <div className="mb-6">
        <LiveStatus updatedAt={updatedAt} refreshing={refreshing} onRefresh={refresh} />
      </div>


      {error && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Stat label="Signups" value={stats.totals.signups} caption={`${stats.totals.signupsReal} real · ${stats.totals.signupsDemo} owner/demo`} />
            <Stat label="Paid subscribers (excl. demo)" value={stats.totals.activeSubscriptions} />
            <Stat label="Successful payments" value={stats.totals.payments} caption="Accepted & matched by webhook" />
            <Stat label="Rejected payment attempts" value={stats.totals.paymentsRejected} caption="Bad merchant id / amount mismatch" />
            <Stat label="Documents generated" value={stats.totals.documents} />
            <Stat label="Chairperson bookings" value={stats.totals.bookings} />
            <Stat label="Contact messages" value={stats.totals.contacts} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Stat label="Signups (7d)" value={stats.signups?.week ?? 0} />
            <Stat label="Signups (30d)" value={stats.signups?.month ?? 0} />
            <Stat label="Page views (24h)" value={stats.pageViews.day} />
            <Stat label="Page views (7d)" value={stats.pageViews.week} />
            <Stat label="Page views (30d)" value={stats.pageViews.month} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Top pages (7d)</CardTitle></CardHeader>
              <CardContent>
                {stats.topPaths.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ul className="text-sm divide-y">
                    {stats.topPaths.map((p) => (
                      <li key={p.path} className="flex justify-between py-1.5">
                        <span className="truncate pr-2">{p.path}</span>
                        <span className="font-mono">{p.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent signups</CardTitle></CardHeader>
              <CardContent>
                {stats.recentSignups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No signups yet.</p>
                ) : (
                  <ul className="text-sm divide-y">
                    {stats.recentSignups.map((u) => (
                      <li key={u.id} className="flex justify-between py-1.5">
                        <span className="truncate pr-2">{u.email}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(u.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Recent documents</CardTitle></CardHeader>
              <CardContent>
                {stats.recentDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents yet.</p>
                ) : (
                  <ul className="text-sm divide-y">
                    {stats.recentDocuments.map((d) => (
                      <li key={d.id} className="flex justify-between py-1.5">
                        <span className="truncate pr-2">{d.doc_type}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(d.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Open errors</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentErrors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open errors — nice.</p>
                ) : (
                  <ul className="text-sm divide-y">
                    {stats.recentErrors.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{e.message || "(no message)"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {e.severity ? `[${e.severity}] ` : ""}
                            {e.route || "—"} · {e.email || "anon"} · {new Date(e.created_at).toLocaleString()}
                            {e.short_id ? ` · #${e.short_id}` : ""}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => resolveError(e.id)}>
                          Mark resolved
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, caption }: { label: string; value: number; caption?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1">{value.toLocaleString()}</div>
        {caption && <div className="text-xs text-muted-foreground mt-1">{caption}</div>}
      </CardContent>
    </Card>
  );
}
