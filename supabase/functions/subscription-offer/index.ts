// Tells the signed-in user whether they can get 20% off their first month.
// Read-only: the checkout re-checks eligibility before charging.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { decideTrialOffer } from "../_shared/offers.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ eligible: false });

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  const userId = data?.claims?.sub;
  if (error || !userId) return json({ eligible: false });

  const admin = createClient(url, service);
  const [{ data: sub }, { data: paid }] = await Promise.all([
    admin.from("subscriptions").select("trial_ends_at").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("payfast_transactions").select("id").eq("user_id", userId)
      .eq("status", "complete").gt("amount", 0).limit(1),
  ]);
  return json(decideTrialOffer({
    trialEndsAt: (sub?.trial_ends_at as string | null) ?? null,
    hasPaidBefore: (paid ?? []).length > 0,
  }));
});
