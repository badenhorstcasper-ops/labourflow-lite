import { useEffect, useState } from "react";
import { toast } from "sonner";
import TeamManagement from "@/components/TeamManagement";
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

const Settings = () => {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status, trial_ends_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub((data as Sub) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
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
            {canCancel && (
              <CardContent>
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
                      <AlertDialogAction onClick={onCancel}>
                        Yes, cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            )}
          </Card>
          <TeamManagement />
        </section>
      </div>
    </div>
  );
};

export default Settings;
