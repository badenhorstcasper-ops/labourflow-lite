import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
    <h1 className="text-3xl font-bold">Payment successful!</h1>
    <p className="max-w-md text-muted-foreground">
      Your iNRECO subscription is now active. If your plan includes multiple
      seats, head to Settings to invite your team members — each will receive
      a secure sign-in link by email.
    </p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button asChild>
        <Link to="/settings">Invite your team</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  </div>
);

export default PaymentSuccess;
