import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * What happens when someone opens the installed shortcut. Instead of the
 * marketing home page they get taken straight to the right place, the way a
 * normal phone app would.
 */
export default function LaunchRouter() {
  const navigate = useNavigate();
  const { loading, authed, isEntitled, status } = useSubscription();

  useEffect(() => {
    if (loading) return;
    if (!authed) {
      navigate("/auth?mode=signup", { replace: true });
      return;
    }
    if (isEntitled) {
      navigate("/app", { replace: true });
      return;
    }
    const reason =
      status === "cancelled"
        ? "subscription_cancelled"
        : status === "pending"
          ? "payment_processing"
          : status === "none"
            ? "no_subscription"
            : "trial_ended";
    navigate(`/pricing?reason=${reason}`, { replace: true });
  }, [loading, authed, isEntitled, status, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img
        src="/icon-192.png"
        alt="iNRECO"
        width={88}
        height={88}
        className="rounded-3xl shadow-lg"
      />
      <p className="text-sm font-semibold tracking-wide text-muted-foreground">iNRECO</p>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
