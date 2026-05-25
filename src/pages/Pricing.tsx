import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string) || "",
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    "",
);

const PAYFAST_URL = "https://www.payfast.co.za/eng/process";
const MERCHANT_ID = "12090292";
const MERCHANT_KEY = "3xbkln8wrhwq";
const RETURN_URL = "https://app.inreco.co.za/payment-success";
const CANCEL_URL = "https://app.inreco.co.za/payment-cancelled";
const NOTIFY_URL =
  "https://ckjevliuwlijfvdjxmmp.supabase.co/functions/v1/payfast-webhook";

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Secure recurring billing via PayFast.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const mPaymentId = `${userId ?? "anon"}|${plan.name}|${Date.now()}`;
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
                  <form action={PAYFAST_URL} method="post">
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
                    {userEmail && (
                      <input type="hidden" name="email_address" value={userEmail} />
                    )}
                    <Button type="submit" className="w-full" disabled={!userId}>
                      {userId ? `Subscribe to ${plan.name}` : "Sign in to subscribe"}
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
