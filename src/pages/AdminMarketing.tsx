import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Check, X, Copy } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";
import { signInPath } from "@/lib/authRedirect";

type OfficialAsset = { name: string; size: number };

type Submission = {
  id: string;
  salesperson_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  mime_type: string | null;
  size: number | null;
  share_with_partners: boolean;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
  salesperson?: { full_name: string; referral_code: string; email: string } | null;
};

export default function AdminMarketing() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [official, setOfficial] = useState<OfficialAsset[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [uploading, setUploading] = useState(false);
  const [textNote, setTextNote] = useState({ title: "", body: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav(signInPath("/admin/marketing")); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id, _role: "admin",
      });
      if (!isAdmin) { nav("/"); return; }
      await Promise.all([loadOfficial(), loadSubmissions()]);
      setLoading(false);
    })();
  }, [nav]);

  async function loadOfficial() {
    const { data } = await supabase.storage.from("partner-marketing").list("official", {
      limit: 200, sortBy: { column: "name", order: "asc" },
    });
    setOfficial((data ?? [])
      .filter((f) => f.name && !f.name.startsWith("."))
      .map((f) => ({ name: f.name, size: f.metadata?.size ?? 0 })));
  }

  async function loadSubmissions() {
    const { data, error } = await supabase
      .from("partner_marketing_submissions")
      .select("*, salesperson:salespersons(full_name, referral_code, email)")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setSubmissions((data ?? []) as Submission[]);
  }

  async function uploadOfficial(file: File) {
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `official/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("partner-marketing").upload(path, file, {
      contentType: file.type || undefined, upsert: false,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Uploaded");
    await loadOfficial();
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadTextNote() {
    if (!textNote.title.trim() || !textNote.body.trim()) {
      toast.error("Title and message required"); return;
    }
    const safe = textNote.title.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `official/${Date.now()}-${safe}.txt`;
    const blob = new Blob([textNote.body], { type: "text/plain" });
    const { error } = await supabase.storage.from("partner-marketing").upload(path, blob, {
      contentType: "text/plain", upsert: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Text note added");
    setTextNote({ title: "", body: "" });
    await loadOfficial();
  }

  async function deleteOfficial(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.storage.from("partner-marketing").remove([`official/${name}`]);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await loadOfficial();
  }

  async function copyLink(fullPath: string) {
    const { data, error } = await supabase.storage.from("partner-marketing").createSignedUrl(fullPath, 3600);
    if (error || !data?.signedUrl) { toast.error("Failed"); return; }
    await navigator.clipboard.writeText(data.signedUrl);
    toast.success("Link copied (1h)");
  }

  async function decide(sub: Submission, approve: boolean) {
    const reason = approve ? null : (prompt("Reason for rejection (optional):") || "");
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("partner_marketing_submissions").update({
      status: approve ? "approved" : "rejected",
      reject_reason: reason,
      decided_at: new Date().toISOString(),
      decided_by: session?.user.id,
    }).eq("id", sub.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Approved" : "Rejected");
    await loadSubmissions();
  }

  async function deleteSubmission(sub: Submission) {
    if (!confirm("Delete this submission and its file?")) return;
    await supabase.storage.from("partner-marketing").remove([sub.storage_path]);
    const { error } = await supabase.from("partner_marketing_submissions").delete().eq("id", sub.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await loadSubmissions();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <BackHomeBar homeTo="/app" />
      <h1 className="text-3xl font-bold mb-1">Marketing library</h1>
      <p className="text-muted-foreground mb-6">Upload official marketing assets and review partner submissions.</p>

      <Tabs defaultValue="official">
        <TabsList>
          <TabsTrigger value="official">Official assets</TabsTrigger>
          <TabsTrigger value="submissions">
            Partner submissions
            {submissions.filter(s => s.status === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {submissions.filter(s => s.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="official" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload a file</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Images, videos, PDFs. Visible to every approved partner.</p>
              <div className="flex items-center gap-2">
                <Input ref={fileRef} type="file" accept="image/*,video/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && uploadOfficial(e.target.files[0])} disabled={uploading} />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Add a text note / message</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title (e.g. WhatsApp opener)" value={textNote.title}
                onChange={(e) => setTextNote({ ...textNote, title: e.target.value })} />
              <Textarea placeholder="Paste the marketing message here..." rows={4} value={textNote.body}
                onChange={(e) => setTextNote({ ...textNote, body: e.target.value })} />
              <Button onClick={uploadTextNote}><Upload className="h-4 w-4 mr-2" />Save text note</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Current official assets ({official.length})</CardTitle></CardHeader>
            <CardContent>
              {official.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
              ) : (
                <ul className="divide-y">
                  {official.map((a) => (
                    <li key={a.name} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{Math.max(1, Math.round(a.size / 1024))} KB</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copyLink(`official/${a.name}`)}>
                          <Copy className="h-3 w-3 mr-1" />Link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteOfficial(a.name)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-3 mt-4">
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No partner submissions yet.</p>
          ) : submissions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">{s.title}</span>
                      <StatusBadge status={s.status} />
                      {s.share_with_partners && <Badge variant="outline">Opt-in shared</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.salesperson?.full_name ?? "?"} · {s.salesperson?.referral_code ?? ""} ·{" "}
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                    {s.description && <p className="text-sm mt-2 whitespace-pre-wrap">{s.description}</p>}
                    {s.reject_reason && (
                      <p className="text-xs text-destructive mt-1">Rejected: {s.reject_reason}</p>
                    )}
                    <div className="mt-2">
                      <Button size="sm" variant="link" className="p-0 h-auto"
                        onClick={() => copyLink(s.storage_path)}>
                        <Copy className="h-3 w-3 mr-1" />Preview link (1h)
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {s.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => decide(s, true)}>
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(s, false)}>
                          <X className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteSubmission(s)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] || ""}`}>{status}</span>;
}
