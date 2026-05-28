import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ErrorRow = {
  id: string; short_id: string; created_at: string; email: string | null;
  route: string | null; message: string; stack: string | null; severity: string;
};
type BugRow = {
  id: string; created_at: string; email: string | null; route: string | null;
  description: string; status: string;
};

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [bugs, setBugs] = useState<BugRow[]>([]);
  const [status, setStatus] = useState<{ db: boolean; auth: boolean; storage: boolean }>({ db: false, auth: false, storage: false });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setEmail(u.user?.email ?? null);
      if (!u.user) { setLoading(false); return; }
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      const admin = !!r;
      setIsAdmin(admin);
      if (admin) {
        const [{ data: e }, { data: b }] = await Promise.all([
          supabase.from("error_logs").select("id, short_id, created_at, email, route, message, stack, severity").order("created_at", { ascending: false }).limit(50),
          supabase.from("bug_reports").select("id, created_at, email, route, description, status").order("created_at", { ascending: false }).limit(50),
        ]);
        setErrors((e as ErrorRow[]) ?? []);
        setBugs((b as BugRow[]) ?? []);
        // Status checks
        const auth = !!u.user;
        let db = false; try { const { error } = await supabase.from("user_roles").select("id").limit(1); db = !error; } catch { /* */ }
        let storage = false; try { const { error } = await supabase.storage.from("documents").list("", { limit: 1 }); storage = !error; } catch { /* */ }
        setStatus({ db, auth, storage });
      }
      setLoading(false);
    })();
  }, []);

  const copyForLovable = async (e: ErrorRow) => {
    const txt = `Please fix error ${e.short_id} on ${e.route ?? "(unknown route)"}: ${e.message}\n\nStack:\n${(e.stack || "").slice(0, 1500)}`;
    try { await navigator.clipboard.writeText(txt); toast.success("Copied — paste into Lovable chat"); }
    catch { toast.error("Could not copy"); }
  };

  if (loading) return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;
  if (!email) return <AppShell><div>Please sign in.</div></AppShell>;
  if (!isAdmin) return <AppShell><div className="rounded border bg-card p-6"><h1 className="text-lg font-semibold mb-1">Restricted</h1><p className="text-sm text-muted-foreground">This page is for the account owner only. If this is your app, ask Lovable to mark <b>{email}</b> as admin.</p></div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold">Health & errors</h1>
          <p className="text-sm text-muted-foreground">Everything in one place. Copy any error and paste into Lovable chat to get it fixed.</p>
        </header>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold mb-2">Backend status</h2>
          <ul className="text-sm grid grid-cols-3 gap-2">
            <Indicator label="Database" ok={status.db} />
            <Indicator label="Authentication" ok={status.auth} />
            <Indicator label="File storage" ok={status.storage} />
          </ul>
        </section>

        <section>
          <h2 className="font-semibold mb-2">Recent errors ({errors.length})</h2>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors logged. 🎉</p>
          ) : (
            <div className="space-y-2">
              {errors.map((e) => (
                <div key={e.id} className="rounded border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-mono text-xs">
                      <b>{e.short_id}</b> · {new Date(e.created_at).toLocaleString()} · {e.email ?? "guest"} · {e.route ?? "—"}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copyForLovable(e)}>Copy for Lovable</Button>
                  </div>
                  <div className="mt-1">{e.message}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold mb-2">User reports ({bugs.length})</h2>
          {bugs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No user reports.</p>
          ) : (
            <div className="space-y-2">
              {bugs.map((b) => (
                <div key={b.id} className="rounded border bg-card p-3 text-sm">
                  <div className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString()} · {b.email ?? "guest"} · {b.route ?? "—"} · <span className="uppercase">{b.status}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{b.description}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Indicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={`rounded border p-2 flex items-center gap-2 ${ok ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900" : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"}`}>
      <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      <span>{label}: <b>{ok ? "OK" : "Down"}</b></span>
    </li>
  );
}
