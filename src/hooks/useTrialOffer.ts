import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OfferKind } from "@/lib/offers";

export type TrialOffer = { eligible: boolean; kind?: OfferKind; endsAt?: string };

/** Asks the server whether this user gets 20% off their first month. */
export function useTrialOffer(): TrialOffer {
  const [offer, setOffer] = useState<TrialOffer>({ eligible: false });
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: res } = await supabase.functions.invoke<TrialOffer>("subscription-offer", { body: {} });
      if (alive && res?.eligible) setOffer(res);
    });
    return () => {
      alive = false;
    };
  }, []);
  return offer;
}

export function formatOfferEnd(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });
}
