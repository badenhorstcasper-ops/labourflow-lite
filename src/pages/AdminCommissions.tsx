import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";

type SP = { id: string; full_name: string; email: string; phone: string | null; referral_code: string | null; status: string; created_at: string; notice_end_date?: string | null; terminated_reason?: string | null };
type Calc = { id: string; salesperson_id: string; calendar_month: string; active_subs_count: number; cancellations_count: number; gross_commission_zar: number; status: string; paid_at: string | null };
type Rate = { id: string; plan_name: string; amount_zar: number; active_from: string; active_to: string | null };

export default function AdminCommissions() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"payouts" | "salespeople" | "applications" | "rates">("payouts");
  const [salespeople, setSalespeople] = useState<SP[]>([]);
  const [calcs, setCalcs] = useState<Calc[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [runMonth, setRunMonth] = useState<string>(() => {
    const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
    return d.toISOString().slice(0, 7);
  });
  const [running, setRunning] = useState(false);

  async function loadAll() {
    const [sp, ca, ra] = await Promise.all([
      supabase.from("salespersons").select("*").order("created_at", { ascending: false }),
      supabase.from("commission_calculations").select("*").order("calendar_month", { ascending: false }),
      supabase.from("commission_rates").select("*").order("active_from", { ascending: false }),
    ]);
    setSalespeople((sp.data as SP[]) || []);
    setCalcs((ca.data as Calc[]) || []);
    setRates((ra.data as Rate[]) || []);
  }

  useEffect(() => { (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { nav("/auth"); return; }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
    if (!isAdmin) { nav("/"); return; }
    await loadAll();
    setLoading(false);
  })(); }, [nav]);

  async function runCalc() {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("run-commission-month", { body: { month: `${runMonth}-01` } });
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Processed ${(data as { processed: number }).processed} salespeople for ${runMonth}`);
    await loadAll();
  }

  async function decide(id: string, action: "approve" | "reject" | "deactivate" | "reactivate") {
    const { error } = await supabase.functions.invoke("approve-salesperson", { body: { id, action } });
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    await loadAll();
  }

  async function terminateNotice(id: string, name: string) {
    if (!confirm(`Give ${name} ONE calendar month's notice? They keep their code and demo access until the notice period ends.`)) return;
    const { data, error } = await supabase.functions.invoke("terminate-partner", { body: { id, mode: "notice" } });
    if (error) { toast.error(error.message); return; }
    toast.success(`Notice served — ends ${(data as { notice_end_date: string }).notice_end_date}`);
    await loadAll();
  }

  async function terminateImmediate(id: string, name: string) {
    const reason = prompt(`Immediate termination of ${name}. Type the reason (breach of clause 6/7, unlawful conduct, etc.):`);
    if (!reason || reason.trim().length < 5) { toast.error("A reason of at least 5 characters is required."); return; }
    const { error } = await supabase.functions.invoke("terminate-partner", { body: { id, mode: "immediate", reason } });
    if (error) { toast.error(error.message); return; }
    toast.success("Partner terminated immediately.");
    await loadAll();
  }

  async function markPaid(id: string) {
    const { error } = await supabase.from("commission_calculations")
      .update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await loadAll();
  }

  async function viewSensitive(spId: string, name: string) {
    const { data, error } = await supabase.rpc("get_salesperson_sensitive", { _salesperson_id: spId });
    if (error) { toast.error(error.message); return; }
    const row = (data as { id_number: string | null; banking_details: Record<string, unknown> | null }[])?.[0];
    if (!row) { toast.error("Not found"); return; }
    alert(`${name}\n\nID: ${row.id_number || "—"}\n\nBanking:\n${JSON.stringify(row.banking_details, null, 2)}`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const spById = Object.fromEntries(salespeople.map(s => [s.id, s]));

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <BackHomeBar homeTo="/app" />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Commissions</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/admin/salespersons/new")}>+ Add salesperson</Button>
          <Button variant="outline" onClick={() => nav("/admin")}>Main admin</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(["payouts", "salespeople", "applications", "rates"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "payouts" ? "Payouts" : t === "salespeople" ? "Salespeople" : t === "applications" ? `Applications (${salespeople.filter(s => s.status === "pending_approval").length})` : "Rates"}
          </button>
        ))}
      </div>

      {tab === "payouts" && (
        <>
          <Card>
            <CardHeader><CardTitle>Run monthly calculation</CardTitle></CardHeader>
            <CardContent className="flex gap-2 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Month</label>
                <Input type="month" value={runMonth} onChange={e => setRunMonth(e.target.value)} />
              </div>
              <Button onClick={runCalc} disabled={running}>{running ? "Running…" : "Run calculation"}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>All payouts</CardTitle></CardHeader>
            <CardContent>
              {calcs.length === 0 ? <p className="text-sm text-muted-foreground">No calculations yet — run one above.</p> : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr><th className="py-2">Month</th><th>Salesperson</th><th>Code</th><th>Subs</th><th>Cancel</th><th>Amount</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {calcs.map(c => {
                      const s = spById[c.salesperson_id];
                      return (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-2">{c.calendar_month.slice(0, 7)}</td>
                          <td>{s?.full_name || "—"}</td>
                          <td className="font-mono text-xs">{s?.referral_code || "—"}</td>
                          <td>{c.active_subs_count}</td>
                          <td>{c.cancellations_count}</td>
                          <td className="font-mono">R{Number(c.gross_commission_zar).toFixed(2)}</td>
                          <td>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${c.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{c.status}</span>
                          </td>
                          <td>
                            {c.status === "pending" && Number(c.gross_commission_zar) > 0 && (
                              <Button size="sm" variant="outline" onClick={() => markPaid(c.id)}>Mark paid</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "salespeople" && (
        <Card>
          <CardHeader><CardTitle>All salespeople</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="py-2">Name</th><th>Email</th><th>Code</th><th>Status</th><th>Notice ends</th><th></th></tr>
              </thead>
              <tbody>
                {salespeople.map(s => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{s.full_name}</td>
                    <td>{s.email}</td>
                    <td className="font-mono text-xs">{s.referral_code || "—"}</td>
                    <td>{s.status}</td>
                    <td className="text-xs">{s.notice_end_date || "—"}</td>
                    <td className="space-x-2 space-y-1">
                      <Button size="sm" variant="outline" onClick={() => viewSensitive(s.id, s.full_name)}>View ID/Bank</Button>
                      {s.status === "active" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => terminateNotice(s.id, s.full_name)}>1-month notice</Button>
                          <Button size="sm" variant="destructive" onClick={() => terminateImmediate(s.id, s.full_name)}>Terminate now (breach)</Button>
                        </>
                      )}
                      {s.status === "notice" && (
                        <Button size="sm" variant="outline" onClick={() => decide(s.id, "deactivate")}>End notice now</Button>
                      )}
                      {s.status === "inactive" && <Button size="sm" variant="outline" onClick={() => decide(s.id, "reactivate")}>Reactivate</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "applications" && (
        <Card>
          <CardHeader><CardTitle>Pending applications</CardTitle></CardHeader>
          <CardContent>
            {salespeople.filter(s => s.status === "pending_approval").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing pending.</p>
            ) : (
              <ul className="divide-y">
                {salespeople.filter(s => s.status === "pending_approval").map(s => (
                  <li key={s.id} className="py-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground">{s.email} · {s.phone} · applied {new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => viewSensitive(s.id, s.full_name)}>View ID/Bank</Button>
                      <Button size="sm" onClick={() => decide(s.id, "approve")}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(s.id, "reject")}>Reject</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "rates" && (
        <Card>
          <CardHeader><CardTitle>Commission rates</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Current monthly commission per active subscriber, per plan.</p>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b"><tr><th className="py-2">Plan</th><th>Amount (ZAR)</th><th>Active from</th><th>Active to</th></tr></thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.plan_name}</td>
                    <td className="font-mono">R{Number(r.amount_zar).toFixed(2)}</td>
                    <td>{r.active_from}</td>
                    <td>{r.active_to || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-4">To change rates, contact your developer — historical months keep the rate that was active on the transaction date.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
