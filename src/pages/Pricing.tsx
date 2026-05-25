import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [teamMemberCount, setTeamMemberCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);
      setUserEmail(auth.user?.email ?? "");
      if (!uid) return;

      const [{ data: sub }, { count }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan_name, status")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("team_members")
          .select("id", { count: "exact", head: true })
          .eq("owner_user_id", uid),
      ]);

      if (sub?.status === "active") setCurrentPlan(sub.plan_name);
      setTeamMemberCount(count ?? 0);
    })();
  }, []);

  const planRows = useMemo(
    () =>
      PLANS.map((plan) => {
        const maxTeammates = Math.max(0, plan.seats - 1);
        const wouldExceed = teamMemberCount > maxTeammates;
        const isCurrent = currentPlan === plan.name;
        return { plan, maxTeammates, wouldExceed, isCurrent };
      }),
    [currentPlan, teamMemberCount],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Choose your plan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Secure recurring billing via PayFast. After payment, invite your
            team from{" "}
            <Link to="/settings" className="underline">
              Settings
            </Link>
            .
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planRows.map(({ plan, wouldExceed, isCurrent }) => {
            const mPaymentId = `${userId ?? "anon"}|${plan.name}|${Date.now()}`;
            const disabled = !userId || isCurrent || wouldExceed;
            return (
              <Card key={plan.name} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent && <Badge>Current plan</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <div>
                    <p className="text-3xl font-bold">
                      R{plan.amount}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.seats} {plan.seats === 1 ? "seat" : "seats"} included
                      {plan.seats > 1 && (
                        <>
                          {" "}
                          (you + {plan.seats - 1} teammate
                          {plan.seats - 1 === 1 ? "" : "s"})
                        </>
                      )}
                    </p>
                    {wouldExceed && !isCurrent && (
                      <p className="mt-3 text-xs text-destructive">
                        You currently have {teamMemberCount} team member
                        {teamMemberCount === 1 ? "" : "s"}. Remove{" "}
                        {teamMemberCount - (plan.seats - 1)} from Settings
                        before switching to this plan.
                      </p>
                    )}
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
                    <Button type="submit" className="w-full" disabled={disabled}>
                      {!userId
                        ? "Sign in to subscribe"
                        : isCurrent
                          ? "Current plan"
                          : wouldExceed
                            ? "Remove members first"
                            : "Continue to PayFast"}
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
