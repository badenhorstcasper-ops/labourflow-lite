import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, FilePlus2, Building2, CreditCard, Activity, LifeBuoy, LogOut } from "lucide-react";
import { TEMPLATE_REGISTRY } from "@/lib/documents/templates";

type Sub = { plan_name: string | null; status: string | null };
type DocRow = {
  id: string;
  doc_type: string;
  title: string;
  doc_number: string;
  pdf_path: string | null;
  docx_path: string | null;
  share_token: string;
  revoked_at: string | null;
  created_at: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [profileComplete, setProfileComplete] = useState(false);
  const [sub, setSub] = useState<Sub | null>(null);
  const [recent, setRecent] = useState<DocRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setEmail(u.user.email || "");

      const { data: ownerData } = await supabase.rpc("current_account_owner");
      const owner = ownerData as unknown as string;

      const [profileRes, subRes, docsRes] = await Promise.all([
        supabase.from("company_profiles").select("company_name").eq("owner_user_id", owner).maybeSingle(),
        supabase.from("subscriptions").select("plan_name, status").eq("user_id", u.user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("generated_documents").select("id, doc_type, title, doc_number, pdf_path, docx_path, share_token, revoked_at, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const name = (profileRes.data as { company_name?: string } | null)?.company_name || "";
      setCompanyName(name);
      setProfileComplete(!!name.trim());
      setSub((subRes.data as Sub) || null);
      setRecent((docsRes.data as DocRow[]) || []);
      setLoading(false);
    })();
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  async function downloadPath(path: string | null) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/d/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  }

  if (loading) {
    return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  }

  const greetingName = companyName || (email ? email.split("@")[0] : "there");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {greetingName}</h1>
            <p className="text-sm text-muted-foreground">
              {sub?.plan_name
                ? <>You're on the <span className="font-medium text-foreground">{sub.plan_name}</span> plan ({sub.status || "active"}).</>
                : <>No active plan yet. <Link to="/pricing" className="underline">See plans</Link>.</>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1.5" /> Sign out
          </Button>
        </div>

        {!profileComplete && (
          <Card className="border-primary/40 bg-primary/10">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Finish your company profile</p>
                <p className="text-sm text-muted-foreground">
                  Add your company name, address and logo so they appear on every document you generate.
                </p>
              </div>
              <Button asChild>
                <Link to="/account-app/profile">Complete profile →</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={<FilePlus2 className="h-5 w-5" />}
            title="Generate a document"
            description="Warnings, contracts, dismissal letters and more."
            href="/account-app/generate"
            cta="Open generator"
            primary
          />
          <ActionCard
            icon={<FileText className="h-5 w-5" />}
            title="My documents"
            description="Download, share or revoke documents you've generated."
            href="/account-app/documents"
            cta="View documents"
          />
          <ActionCard
            icon={<Building2 className="h-5 w-5" />}
            title="Company profile"
            description="Branding and details shown on every document."
            href="/account-app/profile"
            cta="Edit profile"
          />
          <ActionCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Subscription"
            description="Manage your plan and billing."
            href="/settings"
            cta="Manage"
          />
          <ActionCard
            icon={<Activity className="h-5 w-5" />}
            title="System health"
            description="Check backend, storage and integrations."
            href="/account-app/health"
            cta="Open health"
          />
          <ActionCard
            icon={<LifeBuoy className="h-5 w-5" />}
            title="Contact support"
            description="Get in touch if something isn't working."
            href="/contact"
            cta="Contact"
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent documents</CardTitle>
            <Link to="/account-app/documents" className="text-sm underline text-muted-foreground">
              See all
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No documents yet. <Link to="/account-app/generate" className="underline">Generate your first document</Link>.
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((r) => {
                  const status = r.revoked_at ? "Revoked" : "Active";
                  return (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-md px-3 py-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.doc_number} · {r.doc_type} · {new Date(r.created_at).toLocaleDateString()} · {status}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {r.pdf_path && <Button size="sm" variant="outline" onClick={() => downloadPath(r.pdf_path)}>PDF</Button>}
                        {r.docx_path && <Button size="sm" variant="outline" onClick={() => downloadPath(r.docx_path)}>DOCX</Button>}
                        <Button size="sm" variant="outline" disabled={!!r.revoked_at} onClick={() => copyLink(r.share_token)}>Copy link</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick start: pick a template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {TEMPLATE_REGISTRY.map((t) => (
                <Link
                  key={t.key}
                  to={`/account-app/generate?template=${t.key}`}
                  className="border rounded-md px-3 py-2 hover:border-primary/60 hover:bg-muted/30 transition"
                >
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function ActionCard({
  icon, title, description, href, cta, primary,
}: {
  icon: React.ReactNode; title: string; description: string; href: string; cta: string; primary?: boolean;
}) {
  return (
    <Card className={primary ? "border-primary/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-primary">{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <Button asChild variant={primary ? "default" : "outline"} size="sm">
          <Link to={href}>{cta} →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
