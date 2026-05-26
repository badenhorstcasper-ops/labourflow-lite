import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

type Row = {
  id: string;
  owner_user_id: string;
  doc_type: string;
  title: string;
  doc_number: string;
  pdf_path: string | null;
  docx_path: string | null;
  share_token: string;
  share_expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export default function DocumentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setAuthed(false); setLoading(false); return; }
    setAuthed(true);
    const { data, error } = await supabase
      .from("generated_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function download(path: string | null) {
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

  async function revoke(id: string) {
    if (!confirm("Revoke this share link? Anyone with the link will lose access.")) return;
    const { error } = await supabase
      .from("generated_documents")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Revoked"); load(); }
  }

  async function remove(id: string, row: Row) {
    if (!confirm("Delete this document permanently?")) return;
    const paths = [row.pdf_path, row.docx_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("documents").remove(paths);
    const { error } = await supabase.from("generated_documents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }

  if (loading) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  if (!authed) {
    return (
      <AppShell>
        <Card><CardContent className="p-6 text-center">
          <p>Sign in to view your documents.</p>
          <Button className="mt-3" asChild><a href="/">Go to sign in</a></Button>
        </CardContent></Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Generated documents</h1>
          <p className="text-sm text-muted-foreground">
            Download, copy a share link, or revoke. Share links expire automatically.
          </p>
        </div>

        {rows.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">
            No documents yet. Generate one from anywhere in the app.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const expired = !r.revoked_at && new Date(r.share_expires_at).getTime() < Date.now();
              const status = r.revoked_at ? "Revoked" : expired ? "Link expired" : "Active";
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.doc_number} · {r.doc_type} · {new Date(r.created_at).toLocaleString()} · {status}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.pdf_path && <Button size="sm" variant="outline" onClick={() => download(r.pdf_path)}>PDF</Button>}
                      {r.docx_path && <Button size="sm" variant="outline" onClick={() => download(r.docx_path)}>DOCX</Button>}
                      <Button size="sm" variant="outline" onClick={() => copyLink(r.share_token)} disabled={!!r.revoked_at}>Copy link</Button>
                      {!r.revoked_at && <Button size="sm" variant="outline" onClick={() => revoke(r.id)}>Revoke</Button>}
                      <Button size="sm" variant="destructive" onClick={() => remove(r.id, r)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
