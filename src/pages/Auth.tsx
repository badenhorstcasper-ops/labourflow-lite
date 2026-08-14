import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackStep } from "@/lib/funnel";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";
import InstallCta from "@/components/InstallCta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import BackHomeBar from "@/components/BackHomeBar";
import { readTrialPlan, startFreeTrial } from "@/lib/trial";
import { readRedirectTarget } from "@/lib/authRedirect";


type Mode = "signup" | "login";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Show "Sign in" by default. Only open on the sign-up form when the person
  // is arriving from a plan/trial link (or explicitly asks for it), so existing
  // customers aren't confronted with "Create your account".
  const [mode, setMode] = useState<Mode>(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = (params.get("mode") || "").toLowerCase();
    if (wanted === "signup" || wanted === "login") return wanted as Mode;
    let pendingPlan: string | null = null;
    try {
      pendingPlan = localStorage.getItem("inreco.pendingPlan");
    } catch (_) {
      pendingPlan = null;
    }
    return params.get("plan") || pendingPlan ? "signup" : "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  async function linkPendingSubscription() {
    try {
      const { data } = await supabase.functions.invoke<{ linked?: boolean }>("link-subscription", { body: {} });
      return !!data?.linked;
    } catch (_) {
      // The app can still open; the backend will retry linking when payment confirms.
      return false;
    }
  }

  function clearPendingSubscription() {
    localStorage.removeItem("inreco.pendingEmail");
    localStorage.removeItem("inreco.pendingPlan");
    localStorage.removeItem("inreco.pendingPayment");
  }

  /** Turns on the card-free trial when someone came in from a "Start free" button. */
  async function startTrialIfRequested() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan") || readTrialPlan();
    if (!plan) return false;
    const result = await startFreeTrial(plan);
    return !!result;
  }

  function nextPathAfterAuth(linked: boolean) {
    // If they were sent here from a page that needs an account, go back there.
    const wanted = readRedirectTarget();
    const pendingPayment = localStorage.getItem("inreco.pendingPayment");
    if (linked) {
      clearPendingSubscription();
      return wanted || "/app";
    }
    if (pendingPayment) return `/payment-success?m=${encodeURIComponent(pendingPayment)}`;
    return wanted || "/app";
  }


  useEffect(() => {
    // If they paid as a guest, pre-fill the email
    const pending = localStorage.getItem("inreco.pendingEmail");
    if (pending) setEmail(pending);

    // If already signed in, link any trial started before signup, then open the app.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      (async () => {
        const linked = await linkPendingSubscription();
        const trialStarted = await startTrialIfRequested();
        navigate(trialStarted ? "/app" : nextPathAfterAuth(linked), { replace: true });
      })();
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: "Please accept the terms",
        description: "You must agree to the Terms, Privacy Policy and Disclaimer to sign up.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        // Auto-confirm is on, so sign them in immediately.
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        void trackStep("/auth", "signed_up");
        const linked = await linkPendingSubscription();
        const trialStarted = await startTrialIfRequested();
        navigate(trialStarted ? "/app" : nextPathAfterAuth(linked), { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const linked = await linkPendingSubscription();
        const trialStarted = await startTrialIfRequested();
        navigate(trialStarted ? "/app" : nextPathAfterAuth(linked), { replace: true });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Unknown error";
      // Turn the technical wording into something a normal person understands.
      let friendly = raw;
      if (/weak|pwned/i.test(raw)) {
        friendly =
          "That password has appeared in a known data leak. Please pick a longer one — three random words works well.";
      } else if (/already registered|already been registered/i.test(raw)) {
        friendly = "There is already an account with this email. Try signing in instead.";
      } else if (/invalid login credentials/i.test(raw)) {
        friendly = "That email and password don't match. Check them, or use 'Forgot your password?'.";
      }
      toast({
        title: mode === "signup" ? "Sign-up failed" : "Sign-in failed",
        description: friendly,
        variant: "destructive",
      });

    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast({
        title: "Enter your email first",
        description: "Type the email address of your account, then tap the link again.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Reset link sent",
        description: "Check your inbox (and spam) for the link to set a new password.",
      });
    } catch (err) {
      toast({
        title: "Could not send reset link",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: "Please accept the terms",
        description: "You must agree to the Terms, Privacy Policy and Disclaimer to sign up.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result?.error) {
      setBusy(false);
      const msg = result.error instanceof Error ? result.error.message : String(result.error);
      toast({ title: "Google sign-in failed", description: msg, variant: "destructive" });
      return;
    }
    if (!result?.redirected) {
      // Got tokens directly; go to dashboard
      const linked = await linkPendingSubscription();
      const trialStarted = await startTrialIfRequested();
      navigate(trialStarted ? "/app" : nextPathAfterAuth(linked), { replace: true });
    }
  }

  return (
    <>
      <Seo title="Sign in or sign up — iNRECO" description="Sign in to iNRECO or create an account to use CARA, generate HR documents and manage your labour compliance subscription." path="/auth" />
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md"><BackHomeBar homeTo="/" /></div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              {mode === "signup" ? "Create your iNRECO account" : "Sign in to iNRECO"}
            </h1>
            <CardDescription>
              {mode === "signup"
                ? "Create your account to start your 7-day free trial — no card needed."
                : "Sign in to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                {mode === "signup" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    At least 8 characters. Three random words is easy to remember and hard to guess.
                  </p>
                )}
              </div>
              {mode === "signup" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="underline">Terms of Use</Link>,{" "}
                    <Link to="/privacy" target="_blank" className="underline">Privacy Policy</Link>{" "}
                    and{" "}
                    <Link to="/disclaimer" target="_blank" className="underline">Disclaimer</Link>.
                    I understand that iNRECO provides IR guidance, not legal advice.
                  </span>
                </label>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              {mode === "login" && (
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground underline"
                  onClick={handleForgotPassword}
                  disabled={busy}
                >
                  Forgot your password?
                </button>
              )}
            </form>
  
  
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
  
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
              Continue with Google
            </Button>
  
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button className="underline" onClick={() => setMode("login")} type="button">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button className="underline" onClick={() => setMode("signup")} type="button">
                    Create an account
                  </button>
                </>
              )}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/pricing" className="underline">
                See plans
              </Link>
            </p>
            <InstallCta variant="card" label="Add iNRECO to my home screen" />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Auth;
