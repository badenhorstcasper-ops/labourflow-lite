import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import InstallAppButton from "@/components/InstallAppButton";
import BackHomeBar from "@/components/BackHomeBar";

const TRIAL_DAYS = 7;

type PlanKind = "paid" | "contact";

type Plan = {
  name: string;
  amount: number;
  priceLabel: string;
  priceSuffix: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  kind: PlanKind;
  trial?: boolean;
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Solo",
    amount: 259,
    priceLabel: "R259",
    priceSuffix: "per month · 1 user",
    tagline: "per month · 1 user",
    description: "For individuals getting started.",
    features: [
      "CARA AI adviser",
      "All documents",
      "CCMA deadline tracker",
      "1 user",
    ],
    cta: "Start 7-day free trial",
    kind: "paid",
    trial: true,
  },
  {
    name: "Business",
    amount: 599,
    priceLabel: "R599",
    priceSuffix: "per month · up to 5 users",
    tagline: "per month · up to 5 users",
    description: "For small teams.",
    features: [
      "Unlimited questions",
      "Up to 5 registered users",
      "All documents",
      "CARA AI adviser",
      "CCMA tracker",
    ],
    cta: "Start 7-day free trial",
    kind: "paid",
    trial: true,
    highlight: true,
  },
  {
    name: "Professional",
    amount: 1499,
    priceLabel: "R1,499",
    priceSuffix: "per month · up to 10 users",
    tagline: "per month · up to 10 users",
    description: "For growing companies.",
    features: [
      "Everything in Business",
      "Up to 10 registered users",
      "CARA as your dedicated AI adviser",
      "WhatsApp support",
    ],
    cta: "Start 7-day free trial",
    kind: "paid",
    trial: true,
  },
  {
    name: "Enterprise",
    amount: 3999,
    priceLabel: "R3,999",
    priceSuffix: "per month · up to 15 users",
    tagline: "per month · up to 15 users",
    description: "For large organisations.",
    features: [
      "Everything in Professional",
      "Up to 15 registered users",
      "CARA as always-on IR adviser",
      "Annual option — pay 10 get 12",
      "WhatsApp support",
    ],
    cta: "Contact Us",
    kind: "contact",
  },
];

function trialBillingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  // PayFast expects YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

type CheckoutResponse = {
  actionUrl?: string;
  fields?: Record<string, string>;
  billingDate?: string;
  mPaymentId?: string;
};

async function functionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const text = await error.context.text();
    try {
      const parsed = JSON.parse(text) as { error?: string; details?: string };
      if (parsed.error?.includes("13-character merchant key")) {
        return "Checkout is being finalised. Please try again in a minute — if it persists, WhatsApp 084 402 7029.";
      }
      return [parsed.error, parsed.details].filter(Boolean).join(" ") || text;
    } catch (_) {
      return text || error.message;
    }
  }
  return error instanceof Error ? error.message : "Checkout could not start. Please try again.";
}

function submitPreparedCheckout(actionUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;
  Object.entries(fields).forEach(([name, value]) => {
    if (!value) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

const REASON_MESSAGES: Record<string, string> = {
  trial_ended: "Your 7-day free trial has ended. Pick a plan to keep using iNRECO.",
  subscription_cancelled: "Your subscription is cancelled. Re-subscribe to keep using iNRECO.",
  no_subscription: "You need an active plan to use iNRECO. Start your 7-day free trial below.",
  payment_processing: "PayFast is still confirming your trial. Please wait a minute, then sign in again or refresh this page.",
};

const Pricing = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? "");
    });
    // Capture ?ref= or use previously stored code
    const urlRef = searchParams.get("ref");
    if (urlRef && /^INR-[A-Z0-9]{4,12}$/i.test(urlRef)) {
      const up = urlRef.toUpperCase();
      try { localStorage.setItem("inreco.ref", up); } catch (_) {}
      setReferralCode(up);
    } else {
      try {
        const stored = localStorage.getItem("inreco.ref");
        if (stored) setReferralCode(stored);
      } catch (_) {}
    }
  }, [searchParams]);

  const checkoutEmail = userEmail || guestEmail.trim().toLowerCase();
  const canSubmit = Boolean(checkoutEmail);
  const billingDate = trialBillingDate();

  async function startCheckout(plan: Plan, mode: "trial" | "now" = "trial") {
    if (!checkoutEmail) {
      setCheckoutError("Please enter your email address before continuing.");
      return;
    }

    setBusyPlan(`${plan.name}:${mode}`);
    setCheckoutError(null);
    try {
      const { data, error } = await supabase.functions.invoke<CheckoutResponse>("payfast-checkout", {
        body: {
          planName: plan.name,
          email: checkoutEmail,
          mode,
          referralCode: referralCode || undefined,
        },
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (!data?.actionUrl || !data.fields) {
        throw new Error("Checkout could not start. Please try again.");
      }


      try {
        localStorage.setItem("inreco.pendingInstallPrompt", "1");
        localStorage.setItem("inreco.pendingEmail", checkoutEmail);
        localStorage.setItem("inreco.pendingPlan", plan.name);
        if (data.mPaymentId) localStorage.setItem("inreco.pendingPayment", data.mPaymentId);
      } catch (_) {
        // Checkout still works if storage is blocked.
      }

      submitPreparedCheckout(data.actionUrl, data.fields);
    } catch (error) {
      setCheckoutError(await functionErrorMessage(error));
      setBusyPlan(null);
    }
  }


  return (

    <Seo title="Pricing — iNRECO Solo & Business plans" description="Simple monthly pricing for iNRECO: the Solo plan for one manager and the Business plan for teams, both with a 7-day free trial." path="/pricing" />    <div className="min-h-screen bg-background">

      <div className="container mx-auto max-w-7xl px-4 py-12">
        <BackHomeBar homeTo="/" />


        {reasonMessage && (
          <div className="mx-auto mb-6 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {reasonMessage}
          </div>
        )}
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Start Free</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every paid plan starts with a <strong>7-day free trial</strong>. Your
            card is secured today via PayFast (no money taken). The first debit
            happens only after day 7, and only if you haven't cancelled.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Secure recurring billing via PayFast.
            By subscribing you agree to our{" "}
            <Link to="/terms" className="underline">Terms of Use</Link>,{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link> and{" "}
            <Link to="/disclaimer" className="underline">Disclaimer</Link>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth" className="underline">
              Sign in
            </Link>
            .
          </p>
          <div className="mt-5 flex justify-center"><InstallAppButton /></div>
          {referralCode && (
            <p className="mt-3 text-xs text-primary">
              Referred by partner code <span className="font-mono">{referralCode}</span>
            </p>
          )}

        </header>

        {!userId && (
          <div className="mx-auto mb-8 max-w-md rounded-lg border bg-card p-4">
            <Label htmlFor="guest-email" className="text-sm">
              Your email
            </Label>
            <Input
              id="guest-email"
              type="email"
              required
              placeholder="you@company.co.za"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mt-2"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              We'll link this trial to your account when you sign up after checkout.
            </p>
          </div>
        )}

        {checkoutError && (
          <div className="mx-auto mb-6 max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {checkoutError}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlight ? "border-primary shadow-lg ring-2 ring-primary" : ""
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle asChild>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <div>
                    <p className="text-3xl font-bold">{plan.priceLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.priceSuffix}</p>
                    {plan.trial && (
                      <p className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        7-day free trial · cancel anytime
                      </p>
                    )}
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.kind === "contact" && (
                    <Button asChild className="w-full" variant="outline">
                      <Link to={`/contact?plan=${encodeURIComponent(plan.name)}`}>
                        {plan.cta}
                      </Link>
                    </Button>
                  )}

                  {plan.kind === "paid" && (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        className="w-full"
                        variant={plan.highlight ? "default" : "outline"}
                        disabled={!canSubmit || busyPlan !== null}
                        onClick={() => startCheckout(plan, "trial")}
                      >
                        {busyPlan === `${plan.name}:trial`
                          ? "Opening PayFast…"
                          : canSubmit
                            ? "Start 7-day free trial"
                            : "Enter your email above"}
                      </Button>
                      <Button
                        type="button"
                        className="w-full"
                        variant="secondary"
                        disabled={!canSubmit || busyPlan !== null}
                        onClick={() => startCheckout(plan, "now")}
                      >
                        {busyPlan === `${plan.name}:now`
                          ? "Opening PayFast…"
                          : `Join now & pay ${plan.priceLabel}`}
                      </Button>
                      <p className="text-center text-[11px] text-muted-foreground">
                        Free trial: no charge today, first debit of {plan.priceLabel} on{" "}
                        {new Date(billingDate).toLocaleDateString("en-ZA")}. Join now: billed
                        today, then monthly.
                      </p>
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
