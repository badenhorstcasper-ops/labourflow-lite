// Owner tool: everyone whose payments look like they stopped, with a one-click
// "ask PayFast the truth and fix the record" button.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  email: string | null;
  plan_name: string | null;
  status: string | null;
  paid_until: string | null;
  payfast_token: string | null;
  payfast_status: string | null;
  payfast_note: string | null;
};

function when(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export default function PaymentsStopped() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});

  async function load() {
    const { data, error } = await supabase.functions.invoke("payfast-reconcile", {
      body: { action: "list" },
    });
    if (error) {
      setRows([]);
      return;
    }
    setRows((data?.rows ?? []) as Row[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function repair(id: string) {
    setBusy(id);
    const token = (tokens[id] ?? "").trim();
    const { data, error } = await supabase.functions.invoke("payfast-reconcile", {
      body: { action: "repair", subscription_id: id, token: token || undefined },
    });
    setBusy(null);
    if (error) {
      toast({ title: "Could not check PayFast", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Checked with PayFast", description: String(data?.result?.note ?? "Done") });
    load();
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Payments that stopped</CardTitle>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Everyone's payments match PayFast. Nothing to repair.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {rows.map((r) => (
              <li key={r.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.email ?? "(no email)"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.plan_name ?? "—"} · {r.status ?? "—"} · paid up to {when(r.paid_until)}
                      {r.payfast_status ? ` · PayFast: ${r.payfast_status}` : ""}
                    </div>
                    {r.payfast_note && (
                      <div className="text-xs text-muted-foreground mt-0.5">{r.payfast_note}</div>
                    )}
                  </div>
                  <Button size="sm" disabled={busy === r.id} onClick={() => repair(r.id)}>
                    {busy === r.id && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Repair from PayFast
                  </Button>
                </div>
                {!r.payfast_token && (
                  <Input
                    value={tokens[r.id] ?? ""}
                    onChange={(e) => setTokens((t) => ({ ...t, [r.id]: e.target.value }))}
                    placeholder="Paste the reference from your PayFast subscriptions screen"
                    className="h-9 text-xs"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
