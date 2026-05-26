import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

// SANDBOX endpoint — switch to https://www.payfast.co.za/eng/process for live
const PAYFAST_URL = "https://sandbox.payfast.co.za/eng/process";
const MERCHANT_ID = "10000100";
const MERCHANT_KEY = "46f0cd694581a";
const RETURN_URL = "https://app.inreco.co.za/payment-success";
const CANCEL_URL = "https://app.inreco.co.za/payment-cancelled";
const NOTIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-webhook`;
const CONTACT_EMAIL = "info@inreco.co.za";

type PlanKind = "free" | "paid" | "contact";

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
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    amount: 0,
    priceLabel: "R0",
    priceSuffix: "Forever free",
    tagline: "1 user · 5 questions/month",
    description: "For individuals trying iNRECO.",
    features: [
      "5 AI questions/month",
      "All topic wizards",
      "Basic documents",
      "CARA AI adviser",
    ],
    cta: "Get Started Free",
    kind: "free",
  },
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
    cta: "Get Solo",
    kind: "paid",
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
    cta: "Get Business",
    kind: "paid",
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
    cta: "Get Professional",
    kind: "paid",
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

const Pricing = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [guestEmail, setGuestEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  const checkoutEmail = userEmail || guestEmail.trim().toLowerCase();
  const canSubmit = Boolean(checkoutEmail);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Secure recurring billing via PayFast (sandbox mode — no real charges).
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
              We'll link this payment to your account when you sign up after checkout.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
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
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.kind === "free" && (
                    <Button
                      asChild
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => {
                        try {
                          localStorage.setItem("inreco.pendingInstallPrompt", "1");
                        } catch (_) {}
                      }}
                    >
                      <Link to="/auth">{plan.cta}</Link>
                    </Button>
                  )}

                  {plan.kind === "contact" && (
                    <Button asChild className="w-full" variant="outline">
                      <a href={`mailto:${CONTACT_EMAIL}?subject=iNRECO Enterprise enquiry`}>
                        {plan.cta}
                      </a>
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
                      <input type="hidden" name="amount" value={plan.amount.toFixed(2)} />
                      <input type="hidden" name="item_name" value={`iNRECO ${plan.name} Plan`} />
                      <input type="hidden" name="subscription_type" value="1" />
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
