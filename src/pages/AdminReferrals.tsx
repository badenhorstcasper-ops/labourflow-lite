import { useEffect, useState } from "react";
import { toast } from "sonner";
import BackHomeBar from "@/components/BackHomeBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { signInPath } from "@/lib/authRedirect";

type Signup = {
  id: string;
  referrer_user_id: string;
  referred_email: string | null;
  code: string;
  status: string;
  blocked_reason: string | null;
  converted_plan: string | null;
  created_at: string;
};

type Credit = {
  id: string;
  user_id: string;
  amount_zar: number;
  plan_name: string | null;
  status: string;
  created_at: string;
};

const money = (n: number) => `R${Number(n || 0).toFixed(2)}`;

export default function AdminReferrals() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [cap, setCap] = useState("500");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: s }, { data: c }, { data: settings }] = await Promise.all([
      supabase.from("referral_signups").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("referral_credits").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("referral_settings").select("monthly_cap_zar").eq("id", 1).maybeSingle(),
    ]);
    setSignups((s as Signup[]) ?? []);
    setCredits((c as Credit[]) ?? []);
    if (settings?.monthly_cap_zar != null) setCap(String(settings.monthly_cap_zar));
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Send visitors to sign in and bring them straight back here afterwards.
        window.location.replace(signInPath("/admin/referrals"));
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setAllowed(!!isAdmin);
      if (isAdmin) await load();
    })();
  }, []);


  async function saveCap() {
    setSaving(true);
    const value = Number(cap);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a rand amount, for example 500.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("referral_settings").update({ monthly_cap_zar: value }).eq("id", 1);
    setSaving(false);
    if (error) toast.error("Could not save the cap.");
    else toast.success(`Monthly cap set to ${money(value)}.`);
  }

  async function reverse(id: string) {
    const { error } = await supabase
      .from("referral_credits")
      .update({ status: "reversed", reversed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Could not reverse that credit."); return; }
    toast.success("Credit reversed.");
    await load();
  }

  if (allowed === null) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!allowed) return <div className="p-8">This page is for the account owner only.</div>;

  const converted = signups.filter((s) => s.status === "converted");
  const byPlan = converted.reduce<Record<string, number>>((acc, s) => {
    const p = s.converted_plan || "Unknown";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const grantedTotal = credits.filter((c) => c.status !== "reversed").reduce((t, c) => t + Number(c.amount_zar), 0);

  return (
    <div className="min-h-screen bg-background">
      <BackHomeBar />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">Refer &amp; Earn overview</h1>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Signups through invite links</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-bold">{signups.filter((s) => s.status !== "blocked").length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Converted to paid</CardDescription></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{converted.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Object.entries(byPlan).map(([p, n]) => `${p}: ${n}`).join(" · ") || "None yet"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Credit granted</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-bold">{money(grantedTotal)}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly credit cap per account</CardTitle>
            <CardDescription>The most any single account can earn in one calendar month.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div>
              <label htmlFor="cap" className="mb-1 block text-sm">Rand per month</label>
              <input
                id="cap"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                inputMode="decimal"
                className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button onClick={saveCap} disabled={saving}>{saving ? "Saving…" : "Save cap"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Credit awarded</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {credits.length === 0 && <p className="text-sm text-muted-foreground">No referral credit yet.</p>}
            {credits.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                <span>
                  {money(Number(c.amount_zar))} · {c.plan_name ?? "—"} ·{" "}
                  <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-ZA")}</span>{" "}
                  · <span className={c.status === "reversed" ? "text-destructive" : ""}>{c.status}</span>
                </span>
                {c.status !== "reversed" && (
                  <Button size="sm" variant="destructive" onClick={() => reverse(c.id)}>Reverse</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent referred signups</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {signups.length === 0 && <p className="text-sm text-muted-foreground">Nobody has used an invite link yet.</p>}
            {signups.map((s) => (
              <div key={s.id} className="rounded-md border border-border p-3 text-sm">
                <span className="font-medium">{s.referred_email ?? "(no email)"}</span> · code {s.code} ·{" "}
                <span className={s.status === "blocked" ? "text-destructive" : "text-muted-foreground"}>
                  {s.status}{s.blocked_reason ? ` (${s.blocked_reason})` : ""}
                </span>
                {s.converted_plan && <> · {s.converted_plan}</>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
