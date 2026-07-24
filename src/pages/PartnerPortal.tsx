import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type SP = { id: string; full_name: string; email: string; phone: string | null; referral_code: string | null; status: string; notice_end_date?: string | null };
type Calc = { id: string; calendar_month: string; active_subs_count: number; cancellations_count: number; gross_commission_zar: number; status: string; paid_at: string | null };

export default function PartnerPortal() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sp, setSp] = useState<SP | null>(null);
  const [calcs, setCalcs] = useState<Calc[]>([]);

  useEffect(() => { (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { nav("/auth?redirect=/partner"); return; }
    const uid = session.user.id;
    const { data } = await supabase.from("salespersons").select("*").eq("user_id", uid).maybeSingle();
    if (!data) {
      // Not yet linked — try match by email
      const em = session.user.email?.toLowerCase();
      if (em) {
        const { data: byEmail } = await supabase.from("salespersons").select("*").ilike("email", em).maybeSingle();
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
  })(); }, [sp?.id]);

  if (loading) return <div className="p-8 text-center">Loading…</div>;

  if (!sp) return (
    <div className="max-w-xl mx-auto p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">No partner account found</h1>
      <p className="text-muted-foreground">This email isn't linked to an active iNRECO partner. Apply below to become one.</p>
      <Link to="/partner/apply"><Button>Apply to become a partner</Button></Link>
    </div>
  );

  if (sp.status !== "active" && sp.status !== "notice") return (
    <div className="max-w-xl mx-auto p-8 text-center space-y-4">
      <h1 className="text-2xl font-bold">Application {sp.status.replace("_", " ")}</h1>
      <p className="text-muted-foreground">We'll email you once your partner account is approved.</p>
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
              To update banking details, email <a className="underline" href="mailto:casperbadenhorst77@outlook.com">casperbadenhorst77@outlook.com</a>. For fraud protection, banking can't be edited from the portal.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
