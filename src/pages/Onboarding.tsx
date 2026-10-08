import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { readRedirectTarget, signInPath } from "@/lib/authRedirect";
import { markOnboarded } from "@/lib/onboarding";
import logo from "@/assets/inreco-logo.png";

export default function Onboarding() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_phone: "", contact_email: "", city: "" });
  const next = readRedirectTarget() || "/app";

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate(signInPath("/welcome"), { replace: true }); return; }
      setUserId(u.user.id);
      setForm((f) => ({ ...f, contact_email: u.user!.email || "" }));
    })();
  }, [navigate]);

  function finish() {
    if (userId) markOnboarded(userId);
    navigate(next, { replace: true });
  }

  async function save() {
    if (!userId) return;
    if (!form.company_name.trim()) { toast.error("Please enter your company name, or tap Skip for now."); return; }
    setSaving(true);
    const { error } = await supabase.from("company_profiles").upsert(
      { owner_user_id: userId, company_name: form.company_name.trim(), contact_phone: form.contact_phone || null, contact_email: form.contact_email || null, city: form.city || null },
      { onConflict: "owner_user_id" },
    );
    setSaving(false);
    if (error) { toast.error("Could not save: " + error.message); return; }
    toast.success("Company details saved");
    finish();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="min-h-[100dvh] bg-background text-foreground px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        <img src={logo} alt="iNRECO" className="h-14 w-14 rounded-xl" />
        <h1 className="mt-6 text-3xl font-bold">Welcome to iNRECO</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Your pocket labour consultant. Tell us about your company so every letter and document carries your name.
        </p>

        <div className="mt-8 space-y-5 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Building2 className="h-4 w-4" /> Your company</div>
          <div className="space-y-2"><Label htmlFor="cn">Company name</Label><Input id="cn" className="h-14 text-base" value={form.company_name} onChange={set("company_name")} placeholder="e.g. Sunrise Bakery (Pty) Ltd" /></div>
          <div className="space-y-2"><Label htmlFor="cp">Phone number</Label><Input id="cp" type="tel" className="h-14 text-base" value={form.contact_phone} onChange={set("contact_phone")} /></div>
          <div className="space-y-2"><Label htmlFor="ce">Email</Label><Input id="ce" type="email" className="h-14 text-base" value={form.contact_email} onChange={set("contact_email")} /></div>
          <div className="space-y-2"><Label htmlFor="cc">Town or city</Label><Input id="cc" className="h-14 text-base" value={form.city} onChange={set("city")} /></div>
          <p className="text-sm text-muted-foreground">You can add your logo and address later under More → Company profile.</p>
        </div>

        <div className="mt-8 space-y-3">
          <Button className="w-full h-14 text-base" onClick={save} disabled={saving || !userId}>{saving ? "Saving…" : "Save and continue"}</Button>
          <Button variant="ghost" className="w-full h-14 text-base" onClick={finish} disabled={!userId}>Skip for now</Button>
        </div>
      </div>
    </main>
  );
}
