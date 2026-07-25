// Owner-only overview dashboard.
// Subscriber tier breakdown + direct vs partner-attributed + partner league table.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";

type LeagueRow = {
  id: string;
  full_name: string;
  email: string;
  referral_code: string | null;
  status: string;
  total_referrals: number;
  last_30d: number;
  last_90d: number;
  access: "active" | "at_risk" | "warning" | "revoked";
};

type Data = {
  tierCounts: Record<string, number>;
  directSubs: number;
  partnerSubs: number;
  totalPaid: number;
  league: LeagueRow[];
};

const ACCESS_LABEL: Record<LeagueRow["access"], { label: string; klass: string }> = {
  active:   { label: "Active",  klass: "bg-green-100 text-green-800" },
  at_risk:  { label: "At risk (30d)", klass: "bg-amber-100 text-amber-800" },
  warning:  { label: "Warning (60d)", klass: "bg-orange-100 text-orange-800" },
  revoked:  { label: "Revoked", klass: "bg-red-100 text-red-800" },
};

export default function AdminOverview() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [pending, setPending] = useState<{ id: string; full_name: string; email: string; created_at: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    const [{ data: ov, error: ovErr }, { data: pend }] = await Promise.all([
      supabase.functions.invoke("owner-overview"),
      supabase
        .from("salespersons")
        .select("id, full_name, email, created_at")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false }),
    ]);
    if (ovErr || (ov as any)?.error) {
      setError(ovErr?.message || (ov as any)?.error || "Failed to load");
    } else {
      setData(ov as Data);
    }
    setPending((pend as any) || []);
    setBusy(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav("/auth?redirect=/admin/overview"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!isAdmin) { nav("/"); return; }
      await load();
      setLoading(false);
    })();
  }, [nav]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackHomeBar homeTo="/app" />
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Owner overview</h1>
          <p className="text-sm text-muted-foreground">Subscribers, direct vs partner-driven signups, and every partner's activity.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin"><Button variant="outline" size="sm">Full admin →</Button></Link>
          <Button size="sm" variant="outline" onClick={load} disabled={busy}>
            <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {["Solo", "Business", "Professional", "Enterprise"].map((t) => (
              <Card key={t}>
                <CardContent className="pt-6">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t}</div>
                  <div className="text-3xl font-bold mt-1">{(data.tierCounts[t] ?? 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Total paid subscribers</div>
                <div className="text-3xl font-bold mt-1">{data.totalPaid}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">From direct advertising</div>
                <div className="text-3xl font-bold mt-1">{data.directSubs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">From partners</div>
                <div className="text-3xl font-bold mt-1">{data.partnerSubs}</div>
              </CardContent>
            </Card>
          </div>

          {pending.length > 0 && (
            <Card className="mb-6 border-amber-500/40">
              <CardHeader>
                <CardTitle className="text-base">Pending partner applications ({pending.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm divide-y">
                  {pending.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email} · {new Date(p.created_at).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Link to={`/admin/partner-decision?id=${p.id}&action=approve`}>
                          <Button size="sm">Approve</Button>
                        </Link>
                        <Link to={`/admin/partner-decision?id=${p.id}&action=reject`}>
                          <Button size="sm" variant="outline">Reject</Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Partner league table</CardTitle>
            </CardHeader>
            <CardContent>
              {data.league.length === 0 ? (
                <p className="text-sm text-muted-foreground">No partners yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr>
                        <th className="py-2">Partner</th>
                        <th>Code</th>
                        <th className="text-right">Total</th>
                        <th className="text-right">30d</th>
                        <th className="text-right">90d</th>
                        <th>Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.league.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2">
                            <div className="font-medium">{r.full_name}</div>
                            <div className="text-xs text-muted-foreground">{r.email}</div>
                          </td>
                          <td className="font-mono">{r.referral_code || "—"}</td>
                          <td className="text-right">{r.total_referrals}</td>
                          <td className="text-right">{r.last_30d}</td>
                          <td className="text-right">{r.last_90d}</td>
                          <td>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${ACCESS_LABEL[r.access].klass}`}>
                              {ACCESS_LABEL[r.access].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
