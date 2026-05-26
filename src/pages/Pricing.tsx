import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
const MERCHANT_ID = "10000100"; // PayFast sandbox merchant id
const MERCHANT_KEY = "46f0cd694581a"; // PayFast sandbox merchant key
const RETURN_URL = "https://app.inreco.co.za/payment-success";
const CANCEL_URL = "https://app.inreco.co.za/payment-cancelled";
const NOTIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payfast-webhook`;

type Plan = {
  name: "Solo" | "Business" | "Professional" | "Enterprise";
  amount: number;
  seats: number;
  description: string;
};

const PLANS: Plan[] = [
  { name: "Solo", amount: 259, seats: 1, description: "For individuals getting started." },
  { name: "Business", amount: 499, seats: 5, description: "For small teams." },
  { name: "Professional", amount: 1499, seats: 10, description: "For growing companies." },
  { name: "Enterprise", amount: 3999, seats: 15, description: "For large organisations." },
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
      <div className="container mx-auto max-w-6xl px-4 py-12">
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const mPaymentId = `${userId ?? "guest"}|${plan.name}|${Date.now()}`;
            return (
              <Card key={plan.name} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <div>
                    <p className="text-3xl font-bold">
                      R{plan.amount}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.seats} {plan.seats === 1 ? "seat" : "seats"} included
                    </p>
                  </div>
                  <form
                    action={PAYFAST_URL}
                    method="post"
                    onSubmit={() => {
                      if (!userId && guestEmail) {
                        // Remember the guest email so PaymentSuccess can pre-fill signup
                        localStorage.setItem("inreco.pendingEmail", guestEmail.trim().toLowerCase());
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
                    <input type="hidden" name="recurring_amount" value={plan.amount.toFixed(2)} />
                    {userId && <input type="hidden" name="custom_str1" value={userId} />}
                    <input type="hidden" name="custom_str2" value={plan.name} />
                    {checkoutEmail && (
                      <>
                        <input type="hidden" name="email_address" value={checkoutEmail} />
                        <input type="hidden" name="custom_str3" value={checkoutEmail} />
                      </>
                    )}
                    <Button type="submit" className="w-full" disabled={!canSubmit}>
                      {userId
                        ? `Subscribe to ${plan.name}`
                        : canSubmit
                          ? `Subscribe to ${plan.name}`
                          : "Enter your email above"}
                    </Button>
                  </form>
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
