import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * A gentle nudge in the last days of the free trial so nobody is surprised
 * when access stops. Nothing shows while there is still plenty of time left.
 */
export default function TrialEndingBanner() {
  const { status, daysLeft, planName } = useSubscription();
  if (status !== "trialing" || daysLeft === null || daysLeft > 3) return null;

  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">
        {daysLeft === 0
          ? "Your free trial ends today."
          : `Your free trial ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`}
      </p>
      <p className="mt-1 text-muted-foreground">
        Add your payment details to keep CARA, your documents and sick-note checks working.
        {planName ? ` You are on the ${planName} plan.` : ""}
      </p>
      <Button asChild size="sm" className="mt-3">
        <Link to="/settings">Add payment details</Link>
      </Button>
    </div>
  );
}
