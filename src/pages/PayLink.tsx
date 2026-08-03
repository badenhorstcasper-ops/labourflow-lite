import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { functionErrorMessage, submitPreparedCheckout } from "@/lib/payfast";
import Seo from "@/components/Seo";

type Resume = {
  actionUrl?: string;
  fields?: Record<string, string>;
  planName?: string;
  amountToday?: number;
  payNow?: boolean;
};

export default function PayLink() {
  const { reference = "" } = useParams();
  const [state, setState] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase.functions.invoke<Resume>("payfast-resume-checkout", {
          body: { reference },
        });
        if (err) throw new Error(await functionErrorMessage(err));
        if (cancelled) return;
        if (!data?.actionUrl || !data.fields) throw new Error("This payment link is not valid.");
        setState(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "This payment link is not valid.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  useEffect(() => {
    if (state?.actionUrl && state.fields) {
      const t = setTimeout(() => submitPreparedCheckout(state.actionUrl!, state.fields!), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <>
      <Seo title="Complete your iNRECO payment" description="Finish paying for your iNRECO plan securely through PayFast." path={`/pay/${reference}`} />
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{error ? "Payment link problem" : "Taking you to PayFast…"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <>
                <p className="text-sm text-destructive">{error}</p>
                <Button asChild variant="outline">
                  <a href="/pricing">Back to plans</a>
                </Button>
              </>
            )}
            {!error && (
              <p className="text-sm text-muted-foreground">
                {state?.planName
                  ? `iNRECO ${state.planName} — R${Number(state.amountToday ?? 0).toFixed(2)} today.`
                  : "Checking your payment details…"}
              </p>
            )}
            {!error && state && (
              <Button type="button" onClick={() => submitPreparedCheckout(state.actionUrl!, state.fields!)}>
                Continue to PayFast
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
