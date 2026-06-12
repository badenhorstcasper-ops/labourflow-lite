import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubStatus = "trialing" | "active" | "cancelled" | "pending" | "none";

export interface SubscriptionInfo {
  loading: boolean;
  authed: boolean;
  status: SubStatus;
  planName: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
  isEntitled: boolean; // true when trialing or active
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionInfo {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState<SubStatus>("none");
  const [planName, setPlanName] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setAuthed(false);
      setStatus("none");
      setPlanName(null);
      setTrialEndsAt(null);
      setLoading(false);
      return;
    }
    setAuthed(true);

    // Resolve the owner (could be a team member acting under an owner).
    let ownerId = user.id;
    try {
      const { data: tm } = await supabase
        .from("team_members")
        .select("owner_user_id")
        .eq("member_user_id", user.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tm?.owner_user_id) ownerId = tm.owner_user_id as string;
    } catch (_) {}

    const { data } = await supabase
      .from("subscriptions")
      .select("plan_name, status, trial_ends_at")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setStatus((data.status as SubStatus) ?? "none");
      setPlanName((data.plan_name as string) ?? null);
      setTrialEndsAt((data as { trial_ends_at?: string | null }).trial_ends_at ?? null);
    } else {
      setStatus("none");
      setPlanName(null);
      setTrialEndsAt(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const daysLeft =
    trialEndsAt && status === "trialing"
      ? Math.max(
          0,
          Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : null;

  const isEntitled = status === "trialing" || status === "active";

  return {
    loading,
    authed,
    status,
    planName,
    trialEndsAt,
    daysLeft,
    isEntitled,
    refresh: load,
  };
}
