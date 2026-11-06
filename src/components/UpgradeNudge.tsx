import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useTrialOffer, formatOfferEnd } from "@/hooks/useTrialOffer";

/**
 * A friendly "keep this going" prompt shown to trial users right after they
 * get real value (a document made, an answer from CARA). Hidden for payers.
 */
export default function UpgradeNudge({ moment }: { moment: "document" | "cara" }) {
  const { status, isAdmin } = useSubscription();
  const offer = useTrialOffer();
  if (isAdmin || status !== "trialing") return null;

  const lead = moment === "document"
    ? "That document took minutes, not a consultant's invoice."
    : "Glad CARA could help.";

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        {lead} Keep it on hand after your trial.
      </p>
      <p className="mt-1 text-muted-foreground">
        {offer.eligible
          ? `Subscribe now and get 20% off your first month (offer ends ${formatOfferEnd(offer.endsAt)}).`
          : "Plans from R259/month, or pay yearly and save 20%."}
      </p>
      <Button asChild size="sm" className="mt-3 min-h-11">
        <Link to="/pricing">See plans</Link>
      </Button>
    </div>
  );
}
