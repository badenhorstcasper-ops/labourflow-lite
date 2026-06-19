import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem("pv_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("pv_sid", sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

export function usePageView() {
  const location = useLocation();
  useEffect(() => {
    // Skip admin & share routes from analytics noise
    if (location.pathname.startsWith("/admin")) return;
    const payload = {
      path: location.pathname,
      referrer: document.referrer || null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 500),
    };
    supabase.from("page_views").insert(payload).then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn("page_view insert failed", error);
    });
  }, [location.pathname]);
}
