import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BackHomeBar from "@/components/BackHomeBar";

type State = "loading" | "valid" | "used" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return setState("invalid");
    const base = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${base}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, { headers: { apikey: key } })
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (d?.valid === false && d?.reason === "already_unsubscribed") setState("used");
        else if (d?.valid) setState("valid");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) return setState("error");
    setState(data?.reason === "already_unsubscribed" ? "used" : "done");
  };

  const copy: Record<State, string> = {
    loading: "Checking your link…",
    valid: "Stop getting emails from iNRECO? You can still sign in and reset your password as normal.",
    used: "You're already unsubscribed. No more emails from us.",
    invalid: "This unsubscribe link isn't valid or has expired.",
    done: "Done. You won't get any more emails from iNRECO.",
    error: "Something went wrong. Please try again in a moment.",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackHomeBar />
      <main className="mx-auto max-w-md px-5 py-10 text-center">
        <h1 className="mb-4 text-2xl font-bold">Email preferences</h1>
        <p className="mb-8 text-muted-foreground">{copy[state]}</p>
        {state === "valid" && (
          <Button className="h-14 w-full text-base" onClick={confirm} disabled={busy}>
            {busy ? "Please wait…" : "Confirm unsubscribe"}
          </Button>
        )}
      </main>
    </div>
  );
}
