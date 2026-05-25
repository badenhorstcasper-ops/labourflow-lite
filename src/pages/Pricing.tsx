import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

const parseEmails = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Pricing = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [teamEmailsByPlan, setTeamEmailsByPlan] = useState<Record<Plan["name"], string>>({
    Solo: "",
    Business: "",
    Professional: "",
    Enterprise: "",
  });
  const [submittingPlan, setSubmittingPlan] = useState<Plan["name"] | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? "");
    });
  }, []);

  const parsedCounts = useMemo(
    () =>
      Object.fromEntries(
        PLANS.map((plan) => [plan.name, parseEmails(teamEmailsByPlan[plan.name]).length]),
      ) as Record<Plan["name"], number>,
    [teamEmailsByPlan],
  );

  const handlePlanSubmit = async (event: FormEvent<HTMLFormElement>, plan: Plan) => {
    event.preventDefault();

    if (!userId) return;

    const rawEmails = teamEmailsByPlan[plan.name] ?? "";
    const emails = parseEmails(rawEmails);
    const maxTeamMembers = Math.max(0, plan.seats - 1);

    if (emails.some((email) => !isValidEmail(email))) {
      toast({
        title: "Check the email addresses",
        description: "Use valid email addresses separated by commas or new lines.",
        variant: "destructive",
      });
      return;
    }

    if (userEmail && emails.includes(userEmail.toLowerCase())) {
      toast({
        title: "Owner email not allowed",
        description: "Do not include the account owner's email in the team list.",
        variant: "destructive",
      });
      return;
    }

    if (emails.length > maxTeamMembers) {
      toast({
        title: "Too many team members",
        description: `The ${plan.name} plan supports up to ${maxTeamMembers} teammate ${maxTeamMembers === 1 ? "email" : "emails"} before checkout.`,
        variant: "destructive",
      });
      return;
    }

    setSubmittingPlan(plan.name);

    try {
      if (plan.seats > 1) {
        const { data: existingRows, error: existingError } = await supabase
          .from("team_members")
          .select("member_email")
          .eq("owner_user_id", userId);

        if (existingError) throw existingError;

        const existingEmails = new Set(
          (existingRows ?? []).map((row) => row.member_email.trim().toLowerCase()),
        );

        const newEmails = emails.filter((email) => !existingEmails.has(email));
        const totalTeamMembers = existingEmails.size + newEmails.length;

        if (totalTeamMembers > maxTeamMembers) {
          toast({
            title: "Plan limit exceeded",
            description: `This plan allows ${maxTeamMembers} teammate ${maxTeamMembers === 1 ? "email" : "emails"} in total before payment.`,
            variant: "destructive",
          });
          setSubmittingPlan(null);
          return;
        }

        if (newEmails.length > 0) {
          const { error: insertError } = await supabase.from("team_members").insert(
            newEmails.map((email) => ({
              owner_user_id: userId,
              member_email: email,
              status: "pending",
            })),
          );

          if (insertError) throw insertError;
        }
      }

      event.currentTarget.submit();
    } catch (error) {
      toast({
        title: "Could not save team members",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setSubmittingPlan(null);
    }
  };

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
                  <form action={PAYFAST_URL} method="post" onSubmit={(event) => void handlePlanSubmit(event, plan)}>
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
                    {plan.seats > 1 && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">Team member emails</p>
                          <p className="text-xs text-muted-foreground">
                            Add up to {plan.seats - 1} teammate email{plan.seats - 1 === 1 ? "" : "s"} before checkout.
                          </p>
                        </div>
                        <Textarea
                          value={teamEmailsByPlan[plan.name]}
                          onChange={(event) =>
                            setTeamEmailsByPlan((current) => ({
                              ...current,
                              [plan.name]: event.target.value,
                            }))
                          }
                          placeholder="alex@example.com&#10;sam@example.com"
                          className="min-h-[112px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          {parsedCounts[plan.name]} of {plan.seats - 1} teammate email{plan.seats - 1 === 1 ? "" : "s"} entered.
                        </p>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!userId || submittingPlan === plan.name}
                    >
                      {!userId
                        ? "Sign in to subscribe"
                        : submittingPlan === plan.name
                          ? "Saving team and redirecting…"
                          : `Continue to PayFast`}
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
