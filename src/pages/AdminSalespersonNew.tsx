import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminSalespersonNew() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    full_name: "", email: "", phone: "", id_number: "",
    bank_name: "", account_holder: "", account_number: "", branch_code: "", account_type: "Cheque",
  });

  useEffect(() => { (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { nav("/auth"); return; }
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
    if (!isAdmin) { nav("/"); return; }
    setReady(true);
  })(); }, [nav]);

  async function save() {
    setBusy(true);
    // Submit as application, then immediately approve.
    const { error: e1 } = await supabase.functions.invoke("submit-partner-application", {
      body: {
        full_name: f.full_name, email: f.email, phone: f.phone, id_number: f.id_number,
        banking_details: {
          bank_name: f.bank_name, account_holder: f.account_holder,
          account_number: f.account_number, branch_code: f.branch_code, account_type: f.account_type,
        },
      },
    });
    if (e1) { setBusy(false); toast.error(e1.message); return; }
    // Find the row we just created
    const { data: row } = await supabase.from("salespersons").select("id").eq("email", f.email.toLowerCase()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (row?.id) {
      await supabase.functions.invoke("approve-salesperson", { body: { id: row.id, action: "approve" } });
    }
    setBusy(false);
    toast.success("Salesperson added and approved");
    nav("/admin/commissions");
  }

  if (!ready) return null;
  const ok = f.full_name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) && f.phone && f.id_number.length === 13 && f.bank_name && f.account_holder && f.account_number && f.branch_code;

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Add salesperson</h1>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Full name</Label><Input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div><Label>ID number</Label><Input value={f.id_number} onChange={e => setF({ ...f, id_number: e.target.value.replace(/\D/g, "").slice(0, 13) })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Bank</Label><Input value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value })} /></div>
            <div><Label>Type</Label>
              <select className="w-full border rounded-md h-10 px-3 bg-background" value={f.account_type} onChange={e => setF({ ...f, account_type: e.target.value })}>
                <option>Cheque</option><option>Savings</option><option>Transmission</option>
              </select>
            </div>
          </div>
          <div><Label>Account holder</Label><Input value={f.account_holder} onChange={e => setF({ ...f, account_holder: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Account number</Label><Input value={f.account_number} onChange={e => setF({ ...f, account_number: e.target.value })} /></div>
            <div><Label>Branch code</Label><Input value={f.branch_code} onChange={e => setF({ ...f, branch_code: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => nav("/admin/commissions")}>Cancel</Button>
            <Button className="flex-1" onClick={save} disabled={!ok || busy}>{busy ? "Saving…" : "Add & approve"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
