import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BackHomeBar from "@/components/BackHomeBar";


const PaymentCancelled = () => {
  useEffect(() => {
    try {
      localStorage.removeItem("inreco.pendingPlan");
      localStorage.removeItem("inreco.pendingPayment");
    } catch (_) {}
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 pt-4"><BackHomeBar homeTo="/" /></div>
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-3xl font-bold">Payment cancelled</h1>
        <p className="text-muted-foreground">
          No payment was taken. You can choose a plan again when you are ready.
        </p>
        <Button asChild>
          <Link to="/pricing">Back to plans</Link>
        </Button>
      </div>
    </div>
  );
};

export default PaymentCancelled;
