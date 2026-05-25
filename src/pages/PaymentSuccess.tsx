import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
    <h1 className="text-3xl font-bold">Payment successful!</h1>
    <p className="text-muted-foreground">Your subscription is now active.</p>
    <Button asChild>
      <Link to="/">Back to dashboard</Link>
    </Button>
  </div>
);

export default PaymentSuccess;
