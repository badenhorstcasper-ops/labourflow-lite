// Owner-only overview dashboard.
// Auto-refreshes so numbers reflect right-now state.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";
import { useLiveData } from "@/hooks/useLiveData";
import LiveStatus from "@/components/LiveStatus";

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
  signups?: { day: number; week: number; month: number };
  newSubs?: { day: number; week: number; month: number };
  attribution24h?: { direct: number; partner: number };
  attribution7d?: { direct: number; partner: number };
  attribution30d?: { direct: number; partner: number };
  recentSignups?: { email: string; created_at: string }[];
  recentSubs?: { email: string; plan_name: string; created_at: string }[];
};

const ACCESS_LABEL: Record<LeagueRow["access"], { label: string; klass: string }> = {
  active:   { label: "Active",  klass: "bg-green-100 text-green-800" },
  at_risk:  { label: "At risk (30d)", klass: "bg-amber-100 text-amber-800" },
  warning:  { label: "Warning (60d)", klass: "bg-orange-100 text-orange-800" },
  revoked:  { label: "Revoked", klass: "bg-red-100 text-red-800" },
};

export default function AdminOverview() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [pending, setPending] = useState<{ id: string; full_name: string; email: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav("/auth?redirect=/admin/overview"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!isAdmin) { nav("/"); return; }
      setAuthorized(true);
      setChecking(false);
    })();
  }, [nav]);

  const { data, error, refreshing, updatedAt, refresh } = useLiveData<Data>(async () => {
    const [{ data: ov, error: ovErr }, { data: pend }] = await Promise.all([
      supabase.functions.invoke("owner-overview"),
      supabase
        .from("salespersons")
        .select("id, full_name, email, created_at")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false }),
    ]);
    if (ovErr) throw new Error(ovErr.message);
    if ((ov as { error?: string })?.error) throw new Error((ov as { error: string }).error);
    setPending((pend as { id: string; full_name: string; email: string; created_at: string }[]) || []);
    return ov as Data;
  }, 30_000);

  if (checking || !authorized) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackHomeBar homeTo="/app" />
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Owner overview</h1>
          <p className="text-sm text-muted-foreground">Subscribers, direct vs partner-driven signups, and every partner's activity.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/admin"><Button variant="outline" size="sm">Full admin →</Button></Link>
          <Link to="/admin/health"><Button variant="outline" size="sm">Live app health →</Button></Link>
        </div>
      </div>
      <LiveHealthBanner />
      <div className="mb-6">

        <LiveStatus updatedAt={updatedAt} refreshing={refreshing} onRefresh={refresh} />
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

          {(data.signups || data.newSubs) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Signups (recent)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="24h" value={data.signups?.day ?? 0} />
                  <MiniStat label="7d" value={data.signups?.week ?? 0} />
                  <MiniStat label="30d" value={data.signups?.month ?? 0} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">New paid subscriptions (recent)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="24h" value={data.newSubs?.day ?? 0} />
                  <MiniStat label="7d" value={data.newSubs?.week ?? 0} />
                  <MiniStat label="30d" value={data.newSubs?.month ?? 0} />
                </CardContent>
              </Card>
            </div>
          )}

          {(data.attribution24h || data.attribution7d || data.attribution30d) && (
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Direct vs partner — recent windows</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr><th className="py-2">Window</th><th className="text-right">Direct</th><th className="text-right">Partner</th></tr>
                  </thead>
                  <tbody>
                    {([
                      ["Last 24 hours", data.attribution24h],
                      ["Last 7 days", data.attribution7d],
                      ["Last 30 days", data.attribution30d],
                    ] as const).map(([label, a]) => (
                      <tr key={label} className="border-b last:border-0">
                        <td className="py-2">{label}</td>
                        <td className="text-right font-mono">{a?.direct ?? 0}</td>
                        <td className="text-right font-mono">{a?.partner ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Latest signups</CardTitle></CardHeader>
              <CardContent>
                {(!data.recentSignups || data.recentSignups.length === 0) ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="text-sm divide-y">
                    {data.recentSignups.map((u) => (
                      <li key={u.email + u.created_at} className="flex justify-between py-1.5 gap-2">
                        <span className="truncate">{u.email}</span>
                        <span className="text-muted-foreground text-xs shrink-0">{new Date(u.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Latest paid subscriptions</CardTitle></CardHeader>
              <CardContent>
                {(!data.recentSubs || data.recentSubs.length === 0) ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="text-sm divide-y">
                    {data.recentSubs.map((s) => (
                      <li key={s.email + s.created_at} className="flex justify-between py-1.5 gap-2">
                        <span className="truncate">{s.email} <span className="text-xs text-muted-foreground">({s.plan_name})</span></span>
                        <span className="text-muted-foreground text-xs shrink-0">{new Date(s.created_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value.toLocaleString()}</div>
    </div>
  );
}
