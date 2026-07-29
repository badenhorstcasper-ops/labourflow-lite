import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type Pending = { kind: "delete" | "revoke"; row: Row } | null;

export default function DocumentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

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

  async function revoke(row: Row) {
    const revokedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("generated_documents")
      .update({ revoked_at: revokedAt })
      .eq("id", row.id)
      .select("id");
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) {
      return toast.error(
        "You don't have permission to revoke this document — ask the account owner."
      );
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, revoked_at: revokedAt } : r)));
    toast.success("Share link revoked");
  }

  async function remove(row: Row) {
    const snapshot = rows;
    // Remove from the list right away, restore if the delete does not stick.
    setRows((prev) => prev.filter((r) => r.id !== row.id));

    const { data, error } = await supabase
      .from("generated_documents")
      .delete()
      .eq("id", row.id)
      .select("id");

    if (error || !data || data.length === 0) {
      setRows(snapshot);
      return toast.error(
        error?.message ||
          "You don't have permission to delete this document — ask the account owner."
      );
    }

    const paths = [row.pdf_path, row.docx_path].filter(Boolean) as string[];
    if (paths.length) {
      const { error: rmErr } = await supabase.storage.from("documents").remove(paths);
      if (rmErr) {
        toast.warning("Document removed, but the stored files could not be deleted.");
        return;
      }
    }
    toast.success("Document deleted");
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "delete") await remove(pending.row);
      else await revoke(pending.row);
    } finally {
      setBusy(false);
      setPending(null);
    }
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
                      {!r.revoked_at && <Button size="sm" variant="outline" onClick={() => setPending({ kind: "revoke", row: r })}>Revoke</Button>}
                      <Button size="sm" variant="destructive" onClick={() => setPending({ kind: "delete", row: r })}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "delete" ? "Delete this document?" : "Revoke this share link?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === "delete"
                ? "This permanently removes the document and its PDF and Word files. This cannot be undone."
                : "Anyone who already has this link will lose access. The document itself stays in your list."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmPending(); }} disabled={busy}>
              {busy ? "Working…" : pending?.kind === "delete" ? "Delete" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

