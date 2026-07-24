import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;

export default function PartnerApply() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);

  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [id_number, setIdNumber] = useState("");
  const [bank_name, setBank] = useState("");
  const [account_holder, setHolder] = useState("");
  const [account_number, setAcct] = useState("");
  const [branch_code, setBranch] = useState("");
  const [account_type, setType] = useState("Cheque");
  const [accept, setAccept] = useState(false);

  const next = () => setStep(s => (Math.min(4, s + 1) as Step));
  const back = () => setStep(s => (Math.max(1, s - 1) as Step));

  const canStep1 = full_name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.trim().length > 5;
  const canStep2 = id_number.trim().length === 13 && bank_name && account_holder && account_number.trim().length >= 6 && branch_code.trim().length >= 4;

  async function submit() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("submit-partner-application", {
      body: {
        full_name, email, phone, id_number,
        banking_details: { bank_name, account_holder, account_number, branch_code, account_type },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Could not submit — please try again.");
      return;
    }
    setStep(4);
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
        <h1 className="text-3xl font-bold mb-2">Become an iNRECO Partner</h1>
        <p className="text-muted-foreground mb-6">
          Earn a monthly commission for every business that signs up with your referral code.
          Solo R50 · Business R90 · Professional R250 · Enterprise R900 per active subscriber.
        </p>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`h-2 flex-1 rounded ${step >= (n as Step) ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "About you"}
              {step === 2 && "ID and banking"}
              {step === 3 && "Confirm"}
              {step === 4 && "Submitted"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div><Label>Full name</Label><Input value={full_name} onChange={e => setName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                <Button className="w-full" onClick={next} disabled={!canStep1}>Continue</Button>
              </>
            )}
            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  We need your ID and banking so we can pay your commission and comply with SARS. This information is stored securely and only visible to iNRECO admin.
                </p>
                <div><Label>ID number (13 digits)</Label><Input value={id_number} onChange={e => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 13))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bank</Label><Input value={bank_name} onChange={e => setBank(e.target.value)} /></div>
                  <div><Label>Account type</Label>
                    <select className="w-full border rounded-md h-10 px-3 bg-background" value={account_type} onChange={e => setType(e.target.value)}>
                      <option>Cheque</option><option>Savings</option><option>Transmission</option>
                    </select>
                  </div>
                </div>
                <div><Label>Account holder</Label><Input value={account_holder} onChange={e => setHolder(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account number</Label><Input value={account_number} onChange={e => setAcct(e.target.value)} /></div>
                  <div><Label>Branch code</Label><Input value={branch_code} onChange={e => setBranch(e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back}>Back</Button>
                  <Button className="flex-1" onClick={next} disabled={!canStep2}>Continue</Button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <ul className="text-sm space-y-1">
                  <li><b>Name:</b> {full_name}</li>
                  <li><b>Email:</b> {email}</li>
                  <li><b>Phone:</b> {phone}</li>
                  <li><b>ID:</b> ***{id_number.slice(-4)}</li>
                  <li><b>Bank:</b> {bank_name} ({account_type})</li>
                  <li><b>Account:</b> ***{account_number.slice(-4)} · Branch {branch_code}</li>
                </ul>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={accept} onChange={e => setAccept(e.target.checked)} />
                  <span>I confirm the details are correct and accept the iNRECO Partner terms — commissions are paid monthly by EFT within 3 business days of month-end and only for subscribers who complete payment via my referral code.</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={back} disabled={busy}>Back</Button>
                  <Button className="flex-1" onClick={submit} disabled={!accept || busy}>{busy ? "Submitting…" : "Submit application"}</Button>
                </div>
              </>
            )}
            {step === 4 && (
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">✅</div>
                <p>Thanks {full_name.split(" ")[0]}! Your application is in.</p>
                <p className="text-sm text-muted-foreground">
                  We'll email you within 2 business days with your unique referral code and a link to the Partner Portal.
                </p>
                <Button onClick={() => nav("/")}>Back to home</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
