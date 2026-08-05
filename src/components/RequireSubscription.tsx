import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import GuestPreview from "@/pages/GuestPreview";

export default function RequireSubscription({
  children,
  allowGuestPreview = false,
}: {
  children: React.ReactNode;
  /** When true, a visitor without an account sees a try-it screen instead of being bounced. */
  allowGuestPreview?: boolean;
}) {
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
    if (allowGuestPreview) return <GuestPreview />;
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
