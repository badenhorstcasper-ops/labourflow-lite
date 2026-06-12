import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TestModeBanner from "@/components/TestModeBanner";

// Live vs sandbox is controlled by VITE_PAYFAST_LIVE in project env.
const IS_LIVE = import.meta.env.VITE_PAYFAST_LIVE === "true";
const PAYFAST_URL = IS_LIVE
  ? "https://www.payfast.co.za/eng/process"
  : "https://sandbox.payfast.co.za/eng/process";
const MERCHANT_ID = IS_LIVE ? "12090292" : "10000100";
// Merchant key is public (it travels in the form). Live key comes from env.
const MERCHANT_KEY = IS_LIVE
  ? (import.meta.env.VITE_PAYFAST_MERCHANT_KEY as string | undefined) || ""
  : "46f0cd694581a";
const RETURN_URL = "https://app.inreco.co.za/payment-success";
const CANCEL_URL = "https://app.inreco.co.za/payment-cancelled";
const NOTIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-webhook`;

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
      "50 AI questions/month",
      "All documents",
      "CCMA deadline tracker",
      "CARA AI adviser",
    ],
    cta: "Start 7-day free trial",
    kind: "paid",
    trial: true,
  },
  {
    name: "Business",
    amount: 499,
    priceLabel: "R499",
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

const REASON_MESSAGES: Record<string, string> = {
  trial_ended: "Your 7-day free trial has ended. Pick a plan to keep using iNRECO.",
  subscription_cancelled: "Your subscription is cancelled. Re-subscribe to keep using iNRECO.",
  no_subscription: "You need an active plan to use iNRECO. Start your 7-day free trial below.",
};

const Pricing = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const reasonMessage = reason ? REASON_MESSAGES[reason] : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  const checkoutEmail = userEmail || guestEmail.trim().toLowerCase();
  const canSubmit = Boolean(checkoutEmail);
  const billingDate = useMemo(() => trialBillingDate(), []);

  return (
    <div className="min-h-screen bg-background">
      <TestModeBanner />
      <div className="container mx-auto max-w-7xl px-4 py-12">
        {reasonMessage && (
          <div className="mx-auto mb-6 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {reasonMessage}
          </div>
        )}
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Start Free</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every paid plan starts with a <strong>7-day free trial</strong> — no
            charge during the trial, cancel anytime.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Secure recurring billing via PayFast (sandbox mode — no real charges).
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const mPaymentId = `${userId ?? "guest"}|${plan.name}|${Date.now()}`;
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
                  <CardTitle>{plan.name}</CardTitle>
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
                    <form
                      action={PAYFAST_URL}
                      method="post"
                      onSubmit={() => {
                        try {
                          localStorage.setItem("inreco.pendingInstallPrompt", "1");
                        } catch (_) {}
                        if (!userId && guestEmail) {
                          localStorage.setItem(
                            "inreco.pendingEmail",
                            guestEmail.trim().toLowerCase(),
                          );
                          localStorage.setItem("inreco.pendingPlan", plan.name);
                        }
                      }}
                    >
                      <input type="hidden" name="merchant_id" value={MERCHANT_ID} />
                      <input type="hidden" name="merchant_key" value={MERCHANT_KEY} />
                      <input type="hidden" name="return_url" value={RETURN_URL} />
                      <input type="hidden" name="cancel_url" value={CANCEL_URL} />
                      <input type="hidden" name="notify_url" value={NOTIFY_URL} />
                      <input type="hidden" name="m_payment_id" value={mPaymentId} />
                      {/* Free 7-day trial: signup amount is 0; first real debit on billing_date. */}
                      <input type="hidden" name="amount" value="0.00" />
                      <input
                        type="hidden"
                        name="item_name"
                        value={`iNRECO ${plan.name} Plan — 7-day free trial`}
                      />
                      <input type="hidden" name="subscription_type" value="1" />
                      <input type="hidden" name="billing_date" value={billingDate} />
                      <input type="hidden" name="frequency" value="3" />
                      <input type="hidden" name="cycles" value="0" />
                      <input
                        type="hidden"
                        name="recurring_amount"
                        value={plan.amount.toFixed(2)}
                      />
                      {userId && <input type="hidden" name="custom_str1" value={userId} />}
                      <input type="hidden" name="custom_str2" value={plan.name} />
                      {checkoutEmail && (
                        <>
                          <input type="hidden" name="email_address" value={checkoutEmail} />
                          <input type="hidden" name="custom_str3" value={checkoutEmail} />
                        </>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        variant={plan.highlight ? "default" : "outline"}
                        disabled={!canSubmit}
                      >
                        {canSubmit ? plan.cta : "Enter your email above"}
                      </Button>
                      <p className="mt-2 text-center text-[11px] text-muted-foreground">
                        No charge today. First debit of {plan.priceLabel} on{" "}
                        {new Date(billingDate).toLocaleDateString("en-ZA")}.
                      </p>
                    </form>
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
