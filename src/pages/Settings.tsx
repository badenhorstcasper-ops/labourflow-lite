import { useEffect, useState } from "react";
import { toast } from "sonner";
import TeamManagement from "@/components/TeamManagement";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Sub = { id: string; plan_name: string; status: string };

const Settings = () => {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("subscriptions")
      .select("id, plan_name, status")
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
    if (!sub) return;
    if (!confirm("Cancel your subscription? You'll keep access until the end of your billing period.")) return;
    setCancelling(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", sub.id);
    setCancelling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Subscription cancelled.");
    refresh();
  }

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
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading…"
                  : sub
                    ? `${sub.plan_name} — ${sub.status}`
                    : "No active subscription."}
              </CardDescription>
            </CardHeader>
            {sub && sub.status === "active" && (
              <CardContent>
                <Button variant="destructive" onClick={onCancel} disabled={cancelling}>
                  {cancelling ? "Cancelling…" : "Cancel subscription"}
                </Button>
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
