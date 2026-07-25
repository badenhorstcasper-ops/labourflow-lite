// Landing page for the one-click Approve / Reject link inside the
// application email. Only admins can trigger the decision; if the visitor
// isn't signed in, we send them to /auth and bring them back.

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { buildRejectionMailto, buildWelcomeMailto } from "@/lib/partnerMail";

type State = "checking" | "not_admin" | "confirm" | "working" | "done_approve" | "done_reject" | "error";

export default function AdminPartnerDecision() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const id = params.get("id") || "";
  const action = (params.get("action") || "").toLowerCase();
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string>("");
  const [partner, setPartner] = useState<{ full_name: string; email: string; referral_code: string | null; status: string } | null>(null);
  const [result, setResult] = useState<{ referral_code: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!id || !["approve", "reject"].includes(action)) {
        setState("error");
        setMessage("Bad link — missing partner id or action.");
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        nav(`/auth?redirect=${encodeURIComponent(`/admin/partner-decision?id=${id}&action=${action}`)}`);
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!isAdmin) { setState("not_admin"); return; }

      const { data: sp } = await supabase
        .from("salespersons")
        .select("full_name, email, referral_code, status")
        .eq("id", id)
        .maybeSingle();
      if (!sp) { setState("error"); setMessage("Application not found."); return; }
      setPartner(sp as any);
      setState("confirm");
    })();
  }, [id, action, nav]);

  async function run() {
    setState("working");
    const { data, error } = await supabase.functions.invoke("approve-salesperson", {
      body: { id, action },
    });
    if (error || (data as any)?.error) {
      setState("error");
      setMessage(error?.message || (data as any)?.error || "Something went wrong.");
      return;
    }
    const code = (data as any)?.referral_code || "";
    setResult({ referral_code: code });
    setState(action === "approve" ? "done_approve" : "done_reject");
  }

  const welcomeHref = useMemo(() => {
    if (!partner || !result) return "";
    return buildWelcomeMailto({
      full_name: partner.full_name,
      email: partner.email,
      referral_code: result.referral_code,
      temporary_password: result.referral_code, // suggested temp password
    });
  }, [partner, result]);

  const rejectHref = useMemo(() => {
    if (!partner) return "";
    return buildRejectionMailto(partner.email, partner.full_name);
  }, [partner]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>
            {action === "approve" ? "Approve partner" : "Reject partner"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {state === "checking" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </div>
          )}
          {state === "not_admin" && (
            <p className="text-destructive">You must be signed in with an admin account.</p>
          )}
          {state === "confirm" && partner && (
            <>
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="font-medium">{partner.full_name}</div>
                <div className="text-muted-foreground">{partner.email}</div>
                <div className="text-xs mt-1">Current status: {partner.status}</div>
                {partner.referral_code && (
                  <div className="text-xs">Existing code: <span className="font-mono">{partner.referral_code}</span></div>
                )}
              </div>
              {action === "approve" ? (
                <p>
                  Approving will generate their unique referral code (or keep the existing one),
                  turn on silent demo access, and open a welcome email in your email app ready to send.
                </p>
              ) : (
                <p>Rejecting will mark this application as rejected and open a rejection email in your email app.</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => nav("/admin/overview")}>Cancel</Button>
                <Button
                  className={`flex-1 ${action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}`}
                  onClick={run}
                >
                  {action === "approve" ? "Yes, approve" : "Yes, reject"}
                </Button>
              </div>
            </>
          )}
          {state === "working" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Working…
            </div>
          )}
          {state === "done_approve" && partner && result && (
            <>
              <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3">
                <p className="font-semibold text-green-700 dark:text-green-400">Approved ✅</p>
                <p className="mt-1">
                  Their unique code: <span className="font-mono font-bold text-lg">{result.referral_code}</span>
                </p>
                <p className="text-xs mt-1">Demo Solo access has been switched on for {partner.email}.</p>
              </div>
              <a href={welcomeHref}>
                <Button className="w-full">Open welcome email in my email app →</Button>
              </a>
              <p className="text-xs text-muted-foreground">
                Tapping the button opens a fully written email addressed to {partner.email} that you just have to send.
              </p>
              <Link to="/admin/overview" className="block text-center text-primary text-sm underline">
                Back to owner dashboard
              </Link>
            </>
          )}
          {state === "done_reject" && partner && (
            <>
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="font-semibold">Rejected.</p>
              </div>
              <a href={rejectHref}>
                <Button variant="outline" className="w-full">Open rejection email in my email app →</Button>
              </a>
              <Link to="/admin/overview" className="block text-center text-primary text-sm underline">
                Back to owner dashboard
              </Link>
            </>
          )}
          {state === "error" && (
            <p className="text-destructive">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
