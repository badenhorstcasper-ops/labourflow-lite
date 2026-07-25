import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import InstallAppButton from "@/components/InstallAppButton";
import BackHomeBar from "@/components/BackHomeBar";

type PaymentStatus = "idle" | "checking" | "pending" | "complete" | "delayed";

const PaymentSuccess = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [searchParams] = useSearchParams();
  const paymentId =
    searchParams.get("m") ||
    (typeof window !== "undefined" ? localStorage.getItem("inreco.pendingPayment") : null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
  }, []);

  useEffect(() => {
    if (!paymentId || !isLoggedIn) return;

    let cancelled = false;
    let attempts = 0;

    async function checkPayment() {
      if (cancelled) return;
      attempts += 1;
      setPaymentStatus((current) => (current === "complete" ? current : "checking"));

      const { data } = await supabase
        .from("payfast_transactions")
        .select("status")
        .eq("m_payment_id", paymentId)
        .maybeSingle();

      if (cancelled) return;

      if (data?.status === "complete") {
        await supabase.functions.invoke("link-subscription", { body: {} });
        try {
          localStorage.removeItem("inreco.pendingEmail");
          localStorage.removeItem("inreco.pendingPlan");
          localStorage.removeItem("inreco.pendingPayment");
        } catch (_) {}
        setPaymentStatus("complete");
        return;
      }

      if (attempts >= 12) {
        setPaymentStatus("delayed");
        return;
      }

      setPaymentStatus("pending");
      window.setTimeout(checkPayment, 2500);
    }

    checkPayment();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, paymentId]);

  const pendingEmail =
    typeof window !== "undefined" ? localStorage.getItem("inreco.pendingEmail") : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 pt-4"><BackHomeBar homeTo="/" /></div>
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">Payment successful!</h1>

      {isLoggedIn ? (
        <>
          <p className="max-w-md text-muted-foreground">
            {paymentStatus === "complete"
              ? "Your trial is active and ready to use."
              : paymentStatus === "delayed"
                ? "PayFast is taking a little longer to confirm your trial. You can try opening the app now, or refresh this page in a minute."
                : paymentId
                  ? "PayFast is confirming your trial. This usually takes a few seconds."
                  : "Your trial is being linked to your account."}
          </p>
          <Button asChild>
            <Link to="/app">Open CARA</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="max-w-md text-muted-foreground">
            Now create your iNRECO account
            {pendingEmail ? (
              <>
                {" "}using <span className="font-medium text-foreground">{pendingEmail}</span>
              </>
            ) : null}{" "}
            so we can link this payment to you.
          </p>
          <Button asChild>
            <Link to="/auth">Create your account</Link>
          </Button>
        </>
      )}

      <InstallAppButton />
      <p className="text-xs text-muted-foreground">
        Tip: on iPhone, use Safari's Share menu → "Add to Home Screen" to install iNRECO.
      </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
