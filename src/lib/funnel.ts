import { supabase } from "@/integrations/supabase/client";

/**
 * Records one step of the "advert → answer → account" journey so the owner
 * dashboard can show exactly where people stop, instead of guessing.
 */
export async function trackStep(path: string, event: string) {
  try {
    let sid = sessionStorage.getItem("pv_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("pv_sid", sid);
    }
    const { data } = await supabase.auth.getSession();
    await supabase.from("page_views").insert({
      path,
      event,
      referrer: document.referrer || null,
      session_id: sid,
      user_id: data.session?.user.id ?? null,
      user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch (_) {
    /* tracking must never break the page */
  }
}
