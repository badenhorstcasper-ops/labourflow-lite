import { useEffect, useState } from "react";
import { toast } from "sonner";
import BackHomeBar from "@/components/BackHomeBar";
import TeamManagement from "@/components/TeamManagement";
import PayfastPayOptions from "@/components/PayfastPayOptions";
import { createCheckout, rememberPendingCheckout, submitPreparedCheckout } from "@/lib/payfast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Sub = {
  id: string;
  plan_name: string;
  status: string;
  trial_ends_at: string | null;
};

type ReferralSummary = {
  signups: number;
  conversions: number;
  credit_available: number;
  credit_earned_total: number;
  credit_this_month: number;
  monthly_cap: number;
};

const CHANGE_PLANS = [
  { name: "Solo", priceLabel: "R259", suffix: "1 user, 2 devices" },
  { name: "Business", priceLabel: "R599", suffix: "Up to 5 team members" },
  { name: "Professional", priceLabel: "R1499", suffix: "Up to 10 team members" },
];

const Settings = () => {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [referral, setReferral] = useState<ReferralSummary | null>(null);
  const [email, setEmail] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status, trial_ends_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub((data as Sub) ?? null);
    const { data: summary } = await supabase.rpc("referral_summary");
    setReferral((summary as unknown as ReferralSummary) ?? null);
    setLoading(false);
  }

  async function changePlan(planName: string) {
    setSwitching(planName);
    try {
      const data = await createCheckout({ planName, email, mode: "now" });
      rememberPendingCheckout(email, planName, data.mPaymentId);
      submitPreparedCheckout(data.actionUrl!, data.fields!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the plan change.");
      setSwitching(null);
    }
  }

  useEffect(() => {
    refresh();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);



  async function onCancel() {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("payfast-cancel", {
        body: {},
      });
      if (error) throw error;
      if (data && (data as { ok?: boolean }).ok) {
        toast.success("Subscription cancelled.");
      } else {
        toast.success("Subscription marked cancelled.");
      }
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not cancel subscription.";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  }

  const canCancel = !!sub && (sub.status === "active" || sub.status === "trialing");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <BackHomeBar homeTo="/app" />
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your plan and team members.
          </p>
        </header>
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading…"
                  : sub
                    ? (
                        <>
                          <strong>{sub.plan_name}</strong> — {sub.status}
                          {sub.trial_ends_at && sub.status === "trialing" && (
                            <>
                              {" "}
                              · first debit on{" "}
                              {new Date(sub.trial_ends_at).toLocaleDateString("en-ZA")}
                            </>
                          )}
                        </>
                      )
                    : "No active subscription."}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Change plan</CardTitle>
              <CardDescription>
                Move up or down a plan at any time. Changing plan starts the new plan today and
                replaces the old monthly amount.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {CHANGE_PLANS.map((p) => (
                <div key={p.name} className="space-y-2 rounded-lg border p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-2xl font-bold">{p.priceLabel}</p>
                  <p className="text-xs text-muted-foreground">{p.suffix}</p>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!email || switching !== null || sub?.plan_name === p.name}
                    onClick={() => changePlan(p.name)}
                  >
                    {sub?.plan_name === p.name
                      ? "Current plan"
                      : switching === p.name
                        ? "Opening PayFast…"
                        : `Switch to ${p.name}`}
                  </Button>
                  <PayfastPayOptions
                    planName={p.name}
                    priceLabel={p.priceLabel}
                    email={email}
                    disabled={!email || switching !== null}
                    onError={(m) => toast.error(m)}
                  />
                </div>
              ))}
            </CardContent>
            {canCancel && (
              <CardContent className="border-t pt-6">
                <p className="mb-2 text-sm text-muted-foreground">
                  Would rather stop altogether? Cancelling now means no further debits — and if
                  you're still in your free trial, nothing is ever taken.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={cancelling}>
                      {cancelling ? "Cancelling…" : "Cancel subscription"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Future debits will stop immediately. You'll lose access to CARA,
                        the document generator and your dashboard. You can re-subscribe
                        at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                      <AlertDialogAction onClick={onCancel}>Yes, cancel</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referral rewards</CardTitle>
              <CardDescription>
                Credit you earned by inviting other employers. It comes off your next payment automatically —
                there is nothing to redeem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold">
                R{Number(referral?.credit_available ?? 0).toFixed(2)}
                <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">available credit</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {referral?.signups ?? 0} people joined with your link · {referral?.conversions ?? 0} on a paid plan ·
                R{Number(referral?.credit_earned_total ?? 0).toFixed(2)} earned in total
              </p>
              <a href="/account-app/refer" className="inline-block text-sm underline">
                Open Refer &amp; Earn
              </a>
            </CardContent>
          </Card>
          <TeamManagement />

        </section>
      </div>
    </div>
  );
};

export default Settings;
