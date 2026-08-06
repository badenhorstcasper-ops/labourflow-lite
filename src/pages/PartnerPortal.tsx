import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import BackHomeBar from "@/components/BackHomeBar";

type SP = { id: string; full_name: string; email: string; phone: string | null; referral_code: string | null; status: string; notice_end_date?: string | null; approved_at?: string | null; demo_revoked_at?: string | null };
type Calc = { id: string; calendar_month: string; active_subs_count: number; cancellations_count: number; gross_commission_zar: number; status: string; paid_at: string | null };
type Sales = { total: number; last30: number; last90: number };

export default function PartnerPortal() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sp, setSp] = useState<SP | null>(null);
  const [calcs, setCalcs] = useState<Calc[]>([]);
  const [sales, setSales] = useState<Sales>({ total: 0, last30: 0, last90: 0 });

  useEffect(() => { (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { nav("/auth?redirect=/partner"); return; }
    const uid = session.user.id;
    const { data } = await supabase.from("salespersons").select(SP_FIELDS).eq("user_id", uid).maybeSingle();
    if (!data) {
      const em = session.user.email?.toLowerCase();
      if (em) {
        const { data: byEmail } = await supabase.from("salespersons").select(SP_FIELDS).ilike("email", em).maybeSingle();
        setSp((byEmail as SP) || null);
      }
    } else {
      setSp(data as SP);
    }
    setLoading(false);
  })(); }, [nav]);

  useEffect(() => { (async () => {
    if (!sp?.id) return;
    const { data } = await supabase.from("commission_calculations")
      .select("*").eq("salesperson_id", sp.id).order("calendar_month", { ascending: false });
    setCalcs((data as Calc[]) || []);

    const now = Date.now();
    const iso30 = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const iso90 = new Date(now - 90 * 24 * 3600 * 1000).toISOString();
    const [{ count: total }, { count: last30 }, { count: last90 }] = await Promise.all([
      supabase.from("referrals").select("*", { count: "exact", head: true }).eq("salesperson_id", sp.id),
      supabase.from("referrals").select("*", { count: "exact", head: true }).eq("salesperson_id", sp.id).gte("created_at", iso30),
      supabase.from("referrals").select("*", { count: "exact", head: true }).eq("salesperson_id", sp.id).gte("created_at", iso90),
    ]);
    setSales({ total: total ?? 0, last30: last30 ?? 0, last90: last90 ?? 0 });
  })(); }, [sp?.id]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;

  if (!sp) return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <BackHomeBar homeTo="/" />
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">No partner account found</h1>
        <p className="text-muted-foreground">This email isn't linked to an active iNRECO partner. Apply below to become one.</p>
        <Link to="/partner/apply"><Button>Apply to become a partner</Button></Link>
      </div>
    </div>
  );

  if (sp.status !== "active" && sp.status !== "notice") return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <BackHomeBar homeTo="/" />
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Application {sp.status.replace("_", " ")}</h1>
        <p className="text-muted-foreground">We'll email you once your partner account is approved.</p>
      </div>
    </div>
  );

  const shareLink = `https://app.inreco.co.za/?ref=${sp.referral_code}`;
  const pricingLink = `https://app.inreco.co.za/pricing?ref=${sp.referral_code}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto max-w-5xl px-4 py-3 flex justify-between items-center">
          <Link to="/" className="font-bold">iNRECO Partner Portal</Link>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); nav("/"); }}>Sign out</Button>
        </div>
      </header>
      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <BackHomeBar homeTo="/" />
        {sp.status === "notice" && (
          <div className="rounded-md border-l-4 border-amber-500 bg-amber-500/10 p-4 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-400">Notice period active</p>
            <p className="mt-1">
              Your partnership will end on <b>{sp.notice_end_date}</b>. Commission earned before that date
              will still be paid on the next scheduled payout. If this is a mistake, email{" "}
              <a className="underline" href="mailto:info@inreco.co.za">info@inreco.co.za</a>.
            </p>
          </div>
        )}

        {/* Access status */}
        {(() => {
          const daysSinceApproved = sp.approved_at
            ? Math.floor((Date.now() - new Date(sp.approved_at).getTime()) / (24 * 3600 * 1000))
            : 0;
          let tone: "green" | "amber" | "orange" | "red" = "green";
          let title = "Demo access: Active";
          let body = "You have free 1-device demo access to the iNRECO app.";
          if (sp.demo_revoked_at) {
            tone = "red";
            title = "Demo access: Switched off";
            body = "No new subscribers have come in for 90+ days. The next subscriber that signs up under your code turns it back on automatically.";
          } else if (sales.last90 === 0 && daysSinceApproved >= 60) {
            tone = "orange";
            title = "Warning — demo access at risk";
            body = "No new subscribers in the last 60 days. Bring in a subscriber before 90 days pass or demo access will be switched off.";
          } else if (sales.last90 === 0 && daysSinceApproved >= 30) {
            tone = "amber";
            title = "Reminder — keep it active";
            body = "No new subscribers this month. Bring in at least one subscriber every 90 days to keep free demo access.";
          }
          const styles: Record<typeof tone, string> = {
            green:  "border-green-500 bg-green-500/10 text-green-800 dark:text-green-300",
            amber:  "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            orange: "border-orange-500 bg-orange-500/10 text-orange-900 dark:text-orange-300",
            red:    "border-red-500 bg-red-500/10 text-red-800 dark:text-red-300",
          };
          return (
            <div className={`rounded-md border-l-4 p-4 text-sm ${styles[tone]}`}>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 opacity-90">{body}</p>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-xs uppercase tracking-wide text-muted-foreground">All-time subscribers</div><div className="text-3xl font-bold mt-1">{sales.total}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs uppercase tracking-wide text-muted-foreground">Last 30 days</div><div className="text-3xl font-bold mt-1">{sales.last30}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs uppercase tracking-wide text-muted-foreground">Last 90 days</div><div className="text-3xl font-bold mt-1">{sales.last90}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Your referral code</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-mono font-bold text-primary">{sp.referral_code}</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareLink); toast.success("Link copied"); }}>Copy home link</Button>
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(pricingLink); toast.success("Link copied"); }}>Copy pricing link</Button>
              <a className="w-full" href={`https://wa.me/?text=${encodeURIComponent(`Try iNRECO for South African labour law: ${shareLink}`)}`} target="_blank" rel="noreferrer"><Button className="w-full" variant="outline">Share on WhatsApp</Button></a>
              <a className="w-full" href={`mailto:?subject=${encodeURIComponent("iNRECO — 7-day free trial")}&body=${encodeURIComponent(`Try iNRECO: ${shareLink}`)}`}><Button className="w-full" variant="outline">Share via email</Button></a>
            </div>
            <Link to="/partner/marketing" className="block">
              <Button className="w-full">Open marketing kit →</Button>
            </Link>
            <a
              className="block"
              href={`mailto:info@inreco.co.za?subject=${encodeURIComponent(`My own marketing draft — ${sp.referral_code}`)}&body=${encodeURIComponent(
                `Hi iNRECO,\n\nI'd like to run my own marketing material under my referral code ${sp.referral_code}.\nPlease review the draft attached (or pasted below) before I post it.\n\nDraft:\n\n\n— ${sp.full_name}`
              )}`}
            >
              <Button variant="outline" className="w-full">
                Send my own marketing draft for approval →
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payout history</CardTitle></CardHeader>
          <CardContent>
            {calcs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payouts yet — get sharing!</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr><th className="py-2">Month</th><th>Subscribers</th><th>Cancellations</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {calcs.map(c => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{c.calendar_month.slice(0, 7)}</td>
                      <td>{c.active_subs_count}</td>
                      <td>{c.cancellations_count}</td>
                      <td className="font-mono">R{Number(c.gross_commission_zar).toFixed(2)}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${c.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><b>Name:</b> {sp.full_name}</div>
            <div><b>Email:</b> {sp.email}</div>
            <div><b>Phone:</b> {sp.phone || "—"}</div>
            <p className="text-xs text-muted-foreground mt-3">
              To update banking details, email <a className="underline" href="mailto:info@inreco.co.za">info@inreco.co.za</a>. For fraud protection, banking can't be edited from the portal.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
