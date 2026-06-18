import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  employeeName?: string;
};

export default function BookHearingDialog({ open, onOpenChange, documentId, employeeName }: Props) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    employer_name: "",
    contact_email: "",
    contact_phone: "",
    employee_name: employeeName || "",
    preferred_platform: "any" as "teams" | "meet" | "any",
    slot1: "",
    slot2: "",
    slot3: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, employee_name: employeeName || f.employee_name }));
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email || "";
      let companyName = "";
      try {
        const { data: ownerData } = await supabase.rpc("current_account_owner");
        const owner = ownerData as unknown as string;
        if (owner) {
          const { data: profile } = await supabase
            .from("company_profiles")
            .select("company_name")
            .eq("owner_user_id", owner)
            .maybeSingle();
          companyName = (profile as { company_name?: string } | null)?.company_name || "";
        }
      } catch (_e) {
        /* ignore */
      }
      setForm((f) => ({
        ...f,
        contact_email: f.contact_email || email,
        employer_name: f.employer_name || companyName,
      }));
    })();
  }, [open, employeeName]);

  function set<K extends keyof typeof form>(key: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  async function submit() {
    const slots = [form.slot1, form.slot2, form.slot3];
    if (!form.employer_name.trim()) return toast.error("Employer / contact name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) return toast.error("Valid contact email required.");
    if (form.contact_phone.trim().length < 5) return toast.error("Contact phone required.");
    if (!form.employee_name.trim()) return toast.error("Employee name required.");
    if (slots.some((s) => !s)) return toast.error("All 3 preferred date-times are required.");
    const now = Date.now();
    const iso = slots.map((s) => new Date(s));
    if (iso.some((d) => isNaN(d.getTime()) || d.getTime() < now))
      return toast.error("Preferred date-times must be in the future.");
    if (new Set(iso.map((d) => d.toISOString())).size !== 3)
      return toast.error("Preferred date-times must be distinct.");

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-chairperson", {
        body: {
          employer_name: form.employer_name.trim(),
          contact_email: form.contact_email.trim().toLowerCase(),
          contact_phone: form.contact_phone.trim(),
          employee_name: form.employee_name.trim(),
          preferred_platform: form.preferred_platform,
          preferred_slots: iso.map((d) => d.toISOString()),
          notes: form.notes.trim() || null,
          document_id: documentId || null,
        },
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; error?: string; errors?: Record<string, string> } | null;
      if (!payload?.ok) {
        const first = payload?.errors ? Object.values(payload.errors)[0] : payload?.error;
        throw new Error(first || "Could not submit request.");
      }
      toast.success("Request sent — iNRECO will contact you within 1 business day.");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Booking failed: " + msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a chairperson</DialogTitle>
          <DialogDescription>
            Online hearing via Teams or Google Meet. Flat fee R2,500 — includes chairing and the
            written outcome. iNRECO will confirm a date and invoice you separately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label>Employer / contact name *</Label>
            <Input className="mt-1" value={form.employer_name} onChange={(e) => set("employer_name", e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Contact email *</Label>
              <Input className="mt-1" type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
            </div>
            <div>
              <Label>Contact phone *</Label>
              <Input className="mt-1" type="tel" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Employee name *</Label>
            <Input className="mt-1" value={form.employee_name} onChange={(e) => set("employee_name", e.target.value)} />
          </div>
          <div>
            <Label>Preferred platform</Label>
            <Select value={form.preferred_platform} onValueChange={(v) => set("preferred_platform", v as typeof form.preferred_platform)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="teams">Microsoft Teams</SelectItem>
                <SelectItem value="meet">Google Meet</SelectItem>
                <SelectItem value="any">No preference</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Three preferred date-times *</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              We'll try to fit as close as possible to these; otherwise iNRECO will contact you directly.
            </p>
            <div className="grid gap-2 mt-2">
              <Input type="datetime-local" value={form.slot1} onChange={(e) => set("slot1", e.target.value)} />
              <Input type="datetime-local" value={form.slot2} onChange={(e) => set("slot2", e.target.value)} />
              <Input type="datetime-local" value={form.slot3} onChange={(e) => set("slot3", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea className="mt-1" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Brief context for the chairperson — nature of the charges, anything we should know." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send booking request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
