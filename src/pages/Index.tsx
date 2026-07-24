import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Smart redirect at "/": signed-in users land on the CARA hub, others go to pricing.
const Index = () => {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate("/pricing", { replace: true });
        return;
      }
      try {
        if (localStorage.getItem("inreco.pendingEmail")) {
          await supabase.functions.invoke("link-subscription", { body: {} });
          localStorage.removeItem("inreco.pendingEmail");
          localStorage.removeItem("inreco.pendingPlan");
        }
      } catch (_) {
        // Continue into the app; the trial record can still be linked after PayFast confirms.
      }
      navigate("/app", { replace: true });
    });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  );
};

export default Index;
