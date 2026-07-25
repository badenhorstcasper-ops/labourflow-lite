import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackHomeBar from "@/components/BackHomeBar";
import { buildApplicationMailto, type ApplicationSummary } from "@/lib/partnerMail";
import {
  CLAUSE_ACCEPTANCE_LABELS,
  PARTNER_AGREEMENT_CLAUSES,
  PARTNER_AGREEMENT_VERSION,
} from "@/lib/partnerAgreement";

type Step = 1 | 2 | 3 | 4;

const normalizeName = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export default function PartnerApply() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [mailtoHref, setMailtoHref] = useState("");
  const [summaryText, setSummaryText] = useState("");

  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [id_number, setIdNumber] = useState("");
  const [bank_name, setBank] = useState("");
  const [account_holder, setHolder] = useState("");
  const [account_number, setAcct] = useState("");
  const [branch_code, setBranch] = useState("");
  const [account_type, setType] = useState("Cheque");

  // Acceptance
  const [acceptAgreement, setAcceptAgreement] = useState(false);
  const [acceptNotEmployment, setAcceptNotEmployment] = useState(false);
  const [acceptTaxAndAds, setAcceptTaxAndAds] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const next = () => setStep((s) => Math.min(4, s + 1) as Step);
  const back = () => setStep((s) => Math.max(1, s - 1) as Step);

  const canStep1 =
    full_name.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    phone.trim().length > 5;
  const canStep2 =
    id_number.trim().length === 13 &&
    bank_name &&
    account_holder &&
    account_number.trim().length >= 6 &&
    branch_code.trim().length >= 4;
  const missingSubmitItems = [
    !acceptAgreement ? "Tick the main Partner Agreement acceptance box." : "",
    !acceptNotEmployment ? "Tick the non-employment acknowledgement box." : "",
    !acceptTaxAndAds ? "Tick the SARS and advertising approval box." : "",
    signatureName.trim().length <= 1 ? "Type your full name in the signature box." : "",
    signatureName.trim().length > 1 && normalizeName(signatureName) !== normalizeName(full_name)
      ? `Your signature must match: ${full_name.trim()}`
      : "",
  ].filter(Boolean);

  const canSubmit =
    acceptAgreement &&
    acceptNotEmployment &&
    acceptTaxAndAds &&
    normalizeName(signatureName) === normalizeName(full_name) &&
    signatureName.trim().length > 1;

  async function submit() {
    if (!canSubmit) {
      toast.error(missingSubmitItems[0] || "Please complete the agreement before submitting.");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-partner-application", {
        body: {
          full_name: full_name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          id_number: id_number.trim(),
          banking_details: {
            bank_name: bank_name.trim(),
            account_holder: account_holder.trim(),
            account_number: account_number.trim(),
            branch_code: branch_code.trim(),
            account_type,
          },
          agreement: {
            version: PARTNER_AGREEMENT_VERSION,
            accepted_full_name: signatureName.trim(),
            clause_flags: {
              agreement: acceptAgreement,
              not_employment: acceptNotEmployment,
              tax_and_ads: acceptTaxAndAds,
            },
            user_agent: navigator.userAgent,
          },
        },
      });
      const payload = data as { ok?: boolean; error?: string; application?: ApplicationSummary } | null;
      if (error || payload?.error || !payload?.application) {
        toast.error(payload?.error || error?.message || "Could not submit — please try again.");
        return;
      }
      const href = buildApplicationMailto(payload.application);
      setMailtoHref(href);
      // Decoded fallback for copy-to-clipboard on the success screen.
      try {
        const url = new URL(href);
        setSummaryText(decodeURIComponent(url.search.split("body=")[1] || ""));
      } catch { /* no-op */ }
      setStep(4);
      // Auto-open the user's email app with the message pre-filled.
      setTimeout(() => { window.location.href = href; }, 300);
    } catch {
      toast.error("Could not submit — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success("Copied — paste into any email to info@inreco.co.za");
    } catch {
      toast.error("Could not copy — please email info@inreco.co.za manually.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold">iNRECO</Link>
          <Link to="/partner" className="text-sm underline text-primary">Partner sign-in</Link>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <BackHomeBar homeTo="/" />
        <h1 className="text-3xl font-bold mb-2">Become an iNRECO Partner</h1>
        <p className="text-muted-foreground mb-6">
          Earn a monthly commission for every business that signs up with your referral code.
          Solo R50 · Business R90 · Professional R250 · Enterprise R900 per active subscriber.
        </p>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`h-2 flex-1 rounded ${step >= (n as Step) ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "About you"}
              {step === 2 && "ID and banking"}
              {step === 3 && "Partner Agreement"}
              {step === 4 && "Submitted"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div><Label>Full name</Label><Input value={full_name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <Button className="w-full" onClick={next} disabled={!canStep1}>Continue</Button>
              </>
            )}
            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  We need your ID and banking so we can pay your commission and comply with SARS.
                  This information is stored securely and only visible to iNRECO admin.
                </p>
                <div><Label>ID number (13 digits)</Label><Input value={id_number} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bank</Label><Input value={bank_name} onChange={(e) => setBank(e.target.value)} /></div>
                  <div>
                    <Label>Account type</Label>
                    <select className="w-full border rounded-md h-10 px-3 bg-background" value={account_type} onChange={(e) => setType(e.target.value)}>
                      <option>Cheque</option><option>Savings</option><option>Transmission</option>
                    </select>
                  </div>
                </div>
                <div><Label>Account holder</Label><Input value={account_holder} onChange={(e) => setHolder(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account number</Label><Input value={account_number} onChange={(e) => setAcct(e.target.value)} /></div>
                  <div><Label>Branch code</Label><Input value={branch_code} onChange={(e) => setBranch(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back}>Back</Button>
                  <Button className="flex-1" onClick={next} disabled={!canStep2}>Continue</Button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="text-sm space-y-2">
                  <p className="text-muted-foreground">
                    This sets out the rules of the referral relationship. It is written in plain language
                    and is governed by South African law. In short: <b>this is not employment</b>, you set
                    your own pace, and iNRECO pays you a monthly commission for subscribers who sign up
                    with your code.
                  </p>
                  <Link to="/partner/agreement" target="_blank" className="underline text-primary text-xs">
                    Open the full agreement in a new tab →
                  </Link>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs space-y-3">
                  {PARTNER_AGREEMENT_CLAUSES.map((c) => (
                    <div key={c.n}>
                      <p className="font-semibold">{c.n}. {c.title}</p>
                      <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{c.body}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      checked={acceptAgreement}
                      onChange={(e) => setAcceptAgreement(e.target.checked)}
                    />
                    <span>{CLAUSE_ACCEPTANCE_LABELS.agreement}</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      checked={acceptNotEmployment}
                      onChange={(e) => setAcceptNotEmployment(e.target.checked)}
                    />
                    <span>{CLAUSE_ACCEPTANCE_LABELS.notEmployment}</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      checked={acceptTaxAndAds}
                      onChange={(e) => setAcceptTaxAndAds(e.target.checked)}
                    />
                    <span>{CLAUSE_ACCEPTANCE_LABELS.taxAndAds}</span>
                  </label>
                </div>

                <div>
                  <Label>Type your full name to sign</Label>
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder={full_name}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must match the name you entered in step 1.
                  </p>
                  {missingSubmitItems.length > 0 && (
                    <p className="text-xs text-destructive mt-2" role="alert">
                      {missingSubmitItems[0]}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={back} disabled={busy}>Back</Button>
                  <Button className="flex-1" onClick={submit} disabled={busy}>
                    {busy ? "Submitting…" : "Sign and submit"}
                  </Button>
                </div>
              </>
            )}
            {step === 4 && (
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">✅</div>
                <p className="font-medium">Thanks {full_name.split(" ")[0]}! Your application is saved.</p>
                <div className="rounded-md border bg-muted/30 p-4 text-sm text-left space-y-2">
                  <p className="font-semibold">One last step</p>
                  <p>
                    Your email app should have opened with a ready-to-send message to
                    <span className="font-mono"> info@inreco.co.za</span>. Just tap <b>Send</b> —
                    that's how iNRECO gets notified.
                  </p>
                  <p>If nothing opened, use one of the buttons below:</p>
                </div>
                <div className="flex flex-col gap-2">
                  {mailtoHref && (
                    <a href={mailtoHref}>
                      <Button className="w-full">Open my email app now</Button>
                    </a>
                  )}
                  <Button variant="outline" onClick={copySummary}>
                    Copy the message instead
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll get a welcome email with your unique referral code once your application is approved
                  (usually within 2 business days).
                </p>
                <Button variant="ghost" onClick={() => nav("/")}>Back to home</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
