import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export default function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { loading, authed, isEntitled, status } = useSubscription();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!isEntitled) {
    const reason =
      status === "cancelled"
        ? "subscription_cancelled"
        : status === "pending"
          ? "payment_processing"
        : status === "none"
          ? "no_subscription"
          : "trial_ended";
    return <Navigate to={`/pricing?reason=${reason}`} replace />;
  }

  return <>{children}</>;
}
