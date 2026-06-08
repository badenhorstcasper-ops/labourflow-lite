import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TestModeBanner from "@/components/TestModeBanner";

const PaymentCancelled = () => (
  <div className="min-h-screen bg-background">
    <TestModeBanner />
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">Payment cancelled</h1>
      <p className="text-muted-foreground">
        You can subscribe any time from your account settings.
      </p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  </div>
);

export default PaymentCancelled;
