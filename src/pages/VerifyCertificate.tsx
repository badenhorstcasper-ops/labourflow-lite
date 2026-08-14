import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ExternalLink,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  classifyOutcome,
  STATUS_OPTIONS,
  statusLabel,
  type Outcome,
  type RegisterStatus,
} from "@/lib/verifyCertificate/outcome";
import {
  buildAlternativeCharge,
  buildPrimaryCharge,
  CHARGE_DISCLAIMER,
  PROCEDURAL_CHECKLIST,
} from "@/lib/verifyCertificate/charges";
import { generateDocument } from "@/lib/documents";
import type { DocumentTemplate } from "@/lib/documents";
import { signInPath } from "@/lib/authRedirect";

const CATEGORIES = [
  "Medical Practitioner",
  "Dentist",
  "Psychologist",
  "Physiotherapist",
  "Chiropractor",
  "Homeopath",
  "Nurse",
  "Other allied health",
] as const;

const REASONS = [
  "Routine spot-check",
  "Suspicious absence pattern",
  "Follows a disciplinary/warning event",
  "Certificate appears altered",
  "Other",
] as const;

type Row = {
  id: string;
  employee_name: string;
  practitioner_name: string;
  practice_number: string;
  outcome: Outcome | "pending";
  created_at: string;
  locked_at: string | null;
};

type FormState = {
  employee_name: string;
  employee_number: string;
  incapacity_from: string;
  incapacity_to: string;
  cert_issued_on: string;
  cert_submitted_on: string;
  practitioner_name: string;
  practice_number: string;
  professional_category: string;
  practice_name: string;
  practice_address: string;
  practice_phone: string;
  reason_for_check: string;
};

const EMPTY: FormState = {
  employee_name: "",
  employee_number: "",
  incapacity_from: "",
  incapacity_to: "",
  cert_issued_on: "",
  cert_submitted_on: "",
  practitioner_name: "",
  practice_number: "",
  professional_category: "",
  practice_name: "",
  practice_address: "",
  practice_phone: "",
  reason_for_check: "",
};

function req(label: string) {
  return (
    <>
      {label} <span className="text-destructive">*</span>
    </>
  );
}

export default function VerifyCertificatePage() {
  const navigate = useNavigate();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<"new" | "history">("new");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate(signInPath("/account-app/verify-certificate"), { replace: true });
        return;
      }
      setUserId(u.user.id);
      setUserEmail(u.user.email || null);
      const { data: o } = await supabase.rpc("current_account_owner");
      setOwnerId(o as unknown as string);
    })();
  }, [navigate]);

  async function loadHistory() {
    if (!ownerId) return;
    const { data, error } = await supabase
      .from("medical_cert_verifications")
      .select("id, employee_name, practitioner_name, practice_number, outcome, created_at, locked_at")
      .eq("account_owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data || []) as Row[]);
  }

  useEffect(() => {
    if (tab === "history") loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ownerId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (outcomeFilter !== "all" && r.outcome !== outcomeFilter) return false;
      if (filter && !r.employee_name.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, outcomeFilter]);

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Verify Sick Note</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Check a medical certificate against the official practitioner registers, record what you found,
        and get guided next steps.
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "new" | "history")}>
        <TabsList>
          <TabsTrigger value="new">New check</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          {ownerId && userId ? (
            <NewCheckFlow
              ownerId={ownerId}
              userId={userId}
              userEmail={userEmail}
              onSaved={() => {
                loadHistory();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Input
              placeholder="Filter by employee name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="max-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                <SelectItem value="discrepancy">Discrepancy</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadHistory}>Refresh</Button>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verification records yet.</p>
          ) : (
            <div className="space-y-2">
              {filteredRows.map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{r.employee_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.practitioner_name} · {r.practice_number} ·{" "}
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <OutcomeBadge outcome={r.outcome} />
                      {r.locked_at && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function OutcomeBadge({ outcome }: { outcome: Outcome | "pending" }) {
  if (outcome === "verified") return <Badge className="bg-green-600 hover:bg-green-600">Verified</Badge>;
  if (outcome === "discrepancy") return <Badge variant="destructive">Discrepancy</Badge>;
  if (outcome === "inconclusive") return <Badge variant="secondary">Inconclusive</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function NewCheckFlow({
  ownerId,
  userId,
  userEmail,
  onSaved,
}: {
  ownerId: string;
  userId: string;
  userEmail: string | null;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [hpcsa, setHpcsa] = useState<RegisterStatus>("");
  const [pcns, setPcns] = useState<RegisterStatus>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showCharges, setShowCharges] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const formValid =
    form.employee_name.trim() &&
    form.practitioner_name.trim() &&
    form.practice_number.trim() &&
    form.professional_category.trim();

  const canScoreResults = !!hpcsa || !!pcns;

  async function insertAudit(vid: string, action: string, snapshot: Record<string, unknown>) {
    await supabase.from("medical_cert_audit_events").insert({
      verification_id: vid,
      account_owner_id: ownerId,
      actor_user_id: userId,
      actor_email: userEmail,
      action,
      snapshot: snapshot as never,
    });
  }

  async function saveStep1() {
    if (!formValid) {
      toast.error("Please fill the required fields marked *");
      return;
    }
    setSaving(true);
    try {
      const insertPayload = {
        account_owner_id: ownerId,
        created_by_user_id: userId,
        employee_name: form.employee_name.trim(),
        practitioner_name: form.practitioner_name.trim(),
        practice_number: form.practice_number.trim(),
        professional_category: form.professional_category,
        employee_number: form.employee_number.trim() || null,
        incapacity_from: form.incapacity_from || null,
        incapacity_to: form.incapacity_to || null,
        cert_issued_on: form.cert_issued_on || null,
        cert_submitted_on: form.cert_submitted_on || null,
        practice_name: form.practice_name.trim() || null,
        practice_address: form.practice_address.trim() || null,
        practice_phone: form.practice_phone.trim() || null,
        reason_for_check: form.reason_for_check || null,
      };
      const { data, error } = await supabase
        .from("medical_cert_verifications")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw error;
      const vid = data.id as string;
      setVerificationId(vid);

      // upload cert if provided
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Certificate file must be under 10 MB.");
        } else {
          const path = `${ownerId}/${vid}/${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("medical-certificates")
            .upload(path, file, { upsert: false, contentType: file.type });
          if (upErr) {
            toast.error("File upload failed: " + upErr.message);
          } else {
            await supabase
              .from("medical_cert_verifications")
              .update({ cert_file_path: path })
              .eq("id", vid);
          }
        }
      }

      await insertAudit(vid, "created", { ...insertPayload, cert_file: file?.name || null });
      setStep(2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function saveStep2() {
    if (!verificationId) return;
    if (!canScoreResults) {
      toast.error("Please record at least one register result before continuing.");
      return;
    }
    setSaving(true);
    try {
      const computed = classifyOutcome(hpcsa, pcns);
      const { error } = await supabase
        .from("medical_cert_verifications")
        .update({
          hpcsa_status: hpcsa || null,
          pcns_status: pcns || null,
          results_notes: notes.trim() || null,
          outcome: computed,
          locked_at: new Date().toISOString(),
        })
        .eq("id", verificationId);
      if (error) throw error;
      await insertAudit(verificationId, "results_saved", {
        hpcsa_status: hpcsa,
        pcns_status: pcns,
        outcome: computed,
        notes: notes.trim() || null,
      });
      await insertAudit(verificationId, "record_locked", { at: new Date().toISOString() });
      setOutcome(computed);
      setStep(3);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function resetAll() {
    setStep(1);
    setForm(EMPTY);
    setFile(null);
    setHpcsa("");
    setPcns("");
    setNotes("");
    setVerificationId(null);
    setOutcome(null);
    setShowCharges(false);
  }

  async function downloadChargesDocx() {
    if (!outcome || outcome !== "discrepancy" || !verificationId) return;
    setDownloading(true);
    try {
      const primary = buildPrimaryCharge({
        employeeName: form.employee_name,
        practitionerName: form.practitioner_name,
        practiceName: form.practice_name,
        incapacityFrom: form.incapacity_from,
        incapacityTo: form.incapacity_to,
        certIssuedOn: form.cert_issued_on,
      });
      const alt = buildAlternativeCharge({
        employeeName: form.employee_name,
        practitionerName: form.practitioner_name,
        incapacityFrom: form.incapacity_from,
        incapacityTo: form.incapacity_to,
      });

      const template: DocumentTemplate = {
        type: "medical_cert_charges",
        title: "Suggested Charges — Suspected Fraudulent Medical Certificate",
        subtitle: `Employee: ${form.employee_name}`,
        body: [
          { kind: "p", text: "This is a draft prepared by the Verify Sick Note module. It must be reviewed and finalised before use." },
          { kind: "h", text: "Primary charge" },
          { kind: "p", text: primary },
          { kind: "h", text: "Alternative / additional charge" },
          { kind: "p", text: alt },
          { kind: "h", text: "Disclaimer" },
          { kind: "p", text: CHARGE_DISCLAIMER },
          { kind: "h", text: "Procedural fairness checklist" },
          { kind: "list", items: PROCEDURAL_CHECKLIST },
        ],
        signatures: [{ label: "Prepared by" }, { label: "Reviewed by (labour law practitioner)" }],
      };
      const result = await generateDocument(template);
      await insertAudit(verificationId, "charges_generated", { doc_number: result.doc_number });
      if (result.docx_url) window.open(result.docx_url, "_blank");
      else if (result.pdf_url) window.open(result.pdf_url, "_blank");
      toast.success("Charges document generated.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription className="text-sm">
          This information is processed solely to verify the validity of the certificate and, where
          necessary, for disciplinary proceedings, in line with the company's POPIA policy and data
          retention schedule.
        </AlertDescription>
      </Alert>

      {/* STEP 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
            Certificate details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Fields marked <span className="text-destructive">*</span> are required so we can search the registers.
            Fill in as much of the rest as you have.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={req("Employee name")} disabled={step > 1}>
              <Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label="Employee number" disabled={step > 1}>
              <Input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label="Incapacity from" disabled={step > 1}>
              <Input type="date" value={form.incapacity_from} onChange={(e) => setForm({ ...form, incapacity_from: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label="Incapacity to" disabled={step > 1}>
              <Input type="date" value={form.incapacity_to} onChange={(e) => setForm({ ...form, incapacity_to: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label="Date certificate issued" disabled={step > 1}>
              <Input type="date" value={form.cert_issued_on} onChange={(e) => setForm({ ...form, cert_issued_on: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label="Date submitted to employer" disabled={step > 1}>
              <Input type="date" value={form.cert_submitted_on} onChange={(e) => setForm({ ...form, cert_submitted_on: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label={req("Practitioner full name")} disabled={step > 1}>
              <Input value={form.practitioner_name} onChange={(e) => setForm({ ...form, practitioner_name: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label={req("Practice / registration number")} disabled={step > 1}>
              <Input value={form.practice_number} onChange={(e) => setForm({ ...form, practice_number: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label={req("Professional category")} disabled={step > 1}>
              <Select value={form.professional_category} onValueChange={(v) => setForm({ ...form, professional_category: v })} disabled={step > 1}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reason for check" disabled={step > 1}>
              <Select value={form.reason_for_check} onValueChange={(v) => setForm({ ...form, reason_for_check: v })} disabled={step > 1}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Practice name" disabled={step > 1}>
              <Input value={form.practice_name} onChange={(e) => setForm({ ...form, practice_name: e.target.value })} disabled={step > 1} />
            </Field>
            <Field label="Practice phone" disabled={step > 1}>
              <Input value={form.practice_phone} onChange={(e) => setForm({ ...form, practice_phone: e.target.value })} disabled={step > 1} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Practice address" disabled={step > 1}>
                <Textarea rows={2} value={form.practice_address} onChange={(e) => setForm({ ...form, practice_address: e.target.value })} disabled={step > 1} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Label>Attach the certificate (image or PDF, up to 10 MB)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={step > 1}
                className="mt-1"
              />
            </div>
          </div>
          {step === 1 && (
            <div className="flex justify-end">
              <Button onClick={saveStep1} disabled={!formValid || saving}>
                {saving ? "Saving…" : "Save & continue"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 2 */}
      {step >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
              Guided verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These open the official verification portals in a new tab. Search using the practitioner's
              name and/or number as printed on the certificate, then record what you find below.
            </p>
            <div className="flex flex-wrap gap-2">
              <ExtLink url="https://hpcsaonline.custhelp.com/app/i_reg_form" label="Check HPCSA iRegister" />
              <ExtLink url="https://www.pcns.co.za/Search/Verify" label="Check PCNS Practice Number" />
              <ExtLink url="https://ahpcsa.co.za/practitioners/" label="Check AHPCSA Register" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="HPCSA / AHPCSA registration status" disabled={step > 2}>
                <Select value={hpcsa} onValueChange={(v) => setHpcsa(v as RegisterStatus)} disabled={step > 2}>
                  <SelectTrigger><SelectValue placeholder="Select what you found…" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="PCNS practice number status" disabled={step > 2}>
                <Select value={pcns} onValueChange={(v) => setPcns(v as RegisterStatus)} disabled={step > 2}>
                  <SelectTrigger><SelectValue placeholder="Select what you found…" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Notes" disabled={step > 2}>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={step > 2}
                    placeholder="Anything odd — address doesn't match, discipline differs, name spelled differently…" />
                </Field>
              </div>
              <div className="md:col-span-2 text-xs text-muted-foreground">
                Check run by <b>{userEmail}</b> at <b>{new Date().toLocaleString()}</b> — captured automatically.
              </div>
            </div>

            {step === 2 && (
              <div className="flex justify-end">
                <Button onClick={saveStep2} disabled={!canScoreResults || saving}>
                  {saving ? "Saving…" : "Save results & lock record"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && outcome && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
              Outcome &amp; guidance
              <Badge variant="outline" className="gap-1 ml-2"><Lock className="h-3 w-3" /> Record locked</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <OutcomeBadge outcome={outcome} />
              <span className="text-sm text-muted-foreground">
                HPCSA/AHPCSA: <b>{statusLabel(hpcsa)}</b> · PCNS: <b>{statusLabel(pcns)}</b>
              </span>
            </div>

            {outcome === "verified" && (
              <Alert className="border-green-500/50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  Certificate details verified against the official register on{" "}
                  {new Date().toLocaleDateString()}. File this verification record with the certificate.
                  No further action required for verification purposes; normal incapacity/absence policies apply.
                </AlertDescription>
              </Alert>
            )}

            {outcome === "inconclusive" && (
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-sm space-y-2">
                  <p><b>Verification could not be completed. Do not treat this as proof of fraud.</b></p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Contact the practice directly using publicly available contact details (not the number on the certificate alone) to confirm the practitioner saw the employee on the stated date.</li>
                    <li>Request the employee's written consent to obtain a duplicate/confirmation certificate from the practice.</li>
                    <li>Retain this record and re-attempt verification.</li>
                    <li>Do not take disciplinary action based on an inconclusive check alone.</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}

            {outcome === "discrepancy" && (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm space-y-2">
                    <p><b>This certificate could not be verified and shows signs of being fraudulent.</b> Before proceeding to discipline:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Contact the practice / HPCSA or AHPCSA directly to confirm in writing that the practitioner/number does not exist or does not match.</li>
                      <li>Do not accuse the employee yet — put the discrepancy to the employee in writing and invite a written response/explanation first (this satisfies the <i>audi alteram partem</i> principle and avoids a later procedural fairness challenge).</li>
                      <li>If the employee cannot provide a satisfactory explanation or supporting proof from the practitioner, this may proceed to a disciplinary hearing.</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                <div>
                  <Button onClick={() => setShowCharges((s) => !s)} variant="secondary">
                    <FileText className="h-4 w-4 mr-1" />
                    {showCharges ? "Hide" : "Generate"} suggested charges
                  </Button>
                </div>
                {showCharges && (
                  <ChargesPanel
                    form={form}
                    onDownload={downloadChargesDocx}
                    downloading={downloading}
                  />
                )}
              </>
            )}

            <div className="pt-4 border-t flex gap-2">
              <Button variant="outline" onClick={resetAll}>Start another check</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  disabled,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-70" : ""}>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ExtLink({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size="sm" className="gap-1" type="button">
        <ExternalLink className="h-4 w-4" /> {label}
      </Button>
    </a>
  );
}

function ChargesPanel({
  form,
  onDownload,
  downloading,
}: {
  form: FormState;
  onDownload: () => void;
  downloading: boolean;
}) {
  const primary = buildPrimaryCharge({
    employeeName: form.employee_name,
    practitionerName: form.practitioner_name,
    practiceName: form.practice_name,
    incapacityFrom: form.incapacity_from,
    incapacityTo: form.incapacity_to,
    certIssuedOn: form.cert_issued_on,
  });
  const alt = buildAlternativeCharge({
    employeeName: form.employee_name,
    practitionerName: form.practitioner_name,
    incapacityFrom: form.incapacity_from,
    incapacityTo: form.incapacity_to,
  });

  async function copyAll() {
    const text = [
      "PRIMARY CHARGE",
      primary,
      "",
      "ALTERNATIVE / ADDITIONAL CHARGE",
      alt,
      "",
      "DISCLAIMER",
      CHARGE_DISCLAIMER,
      "",
      "PROCEDURAL FAIRNESS CHECKLIST",
      ...PROCEDURAL_CHECKLIST.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  return (
    <div className="rounded border bg-muted/40 p-4 space-y-3 text-sm">
      <div>
        <div className="font-semibold">Primary charge</div>
        <p className="mt-1 whitespace-pre-wrap">{primary}</p>
      </div>
      <div>
        <div className="font-semibold">Alternative / additional charge</div>
        <p className="mt-1 whitespace-pre-wrap">{alt}</p>
      </div>
      <div className="text-xs text-muted-foreground italic">{CHARGE_DISCLAIMER}</div>
      <div>
        <div className="font-semibold">Procedural fairness checklist</div>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          {PROCEDURAL_CHECKLIST.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={copyAll}><Copy className="h-4 w-4 mr-1" /> Copy</Button>
        <Button size="sm" onClick={onDownload} disabled={downloading}>
          <Download className="h-4 w-4 mr-1" /> {downloading ? "Preparing…" : "Download as .docx"}
        </Button>
      </div>
    </div>
  );
}
