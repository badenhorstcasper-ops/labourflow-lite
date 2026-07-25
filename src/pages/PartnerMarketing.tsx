import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import BackHomeBar from "@/components/BackHomeBar";

type Asset = { name: string; size: number };

type Submission = {
  id: string;
  salesperson_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  mime_type: string | null;
  share_with_partners: boolean;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
};

export default function PartnerMarketing() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [salespersonId, setSalespersonId] = useState<string | null>(null);
  const [official, setOfficial] = useState<Asset[]>([]);
  const [mine, setMine] = useState<Submission[]>([]);
  const [community, setCommunity] = useState<Submission[]>([]);

  // upload dialog state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [textBody, setTextBody] = useState("");
  const [share, setShare] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav("/auth?redirect=/partner/marketing"); return; }

      const uid = session.user.id;
      const { data: sp } = await supabase
        .from("salespersons")
        .select("id, referral_code, status")
        .or(`user_id.eq.${uid},email.eq.${session.user.email?.toLowerCase() ?? ""}`)
        .maybeSingle();

      if (!sp || (sp.status !== "active" && sp.status !== "notice")) {
        toast.error("Marketing kit is only available to approved partners.");
        nav("/partner");
        return;
      }
      setReferralCode(sp.referral_code);
      setSalespersonId(sp.id);

      await Promise.all([loadOfficial(), loadSubmissions(sp.id)]);
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

  async function loadSubmissions(spId: string) {
    const { data: mineData } = await supabase
      .from("partner_marketing_submissions").select("*")
      .eq("salesperson_id", spId).order("created_at", { ascending: false });
    setMine((mineData ?? []) as Submission[]);

    const { data: commData } = await supabase
      .from("partner_marketing_submissions").select("*")
      .eq("status", "approved").eq("share_with_partners", true)
      .neq("salesperson_id", spId).order("created_at", { ascending: false });
    setCommunity((commData ?? []) as Submission[]);
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("partner-marketing").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { toast.error("Could not prepare download."); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function submitUpload() {
    if (!salespersonId) return;
    if (!title.trim()) { toast.error("Please add a title"); return; }
    if (!file && !textBody.trim()) { toast.error("Attach a file or write a text message"); return; }
    if (file && file.size > 25 * 1024 * 1024) { toast.error("File must be under 25 MB"); return; }

    setUploading(true);
    try {
      const isText = !file;
      const filename = isText
        ? `${Date.now()}-${title.replace(/[^a-zA-Z0-9._-]/g, "_")}.txt`
        : `${Date.now()}-${file!.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `submissions/${salespersonId}/${filename}`;
      const body: Blob = isText ? new Blob([textBody], { type: "text/plain" }) : file!;
      const mime = isText ? "text/plain" : (file!.type || "application/octet-stream");
      const size = isText ? body.size : file!.size;

      const { error: upErr } = await supabase.storage.from("partner-marketing").upload(path, body, {
        contentType: mime, upsert: false,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("partner_marketing_submissions").insert({
        salesperson_id: salespersonId,
        title: title.trim(),
        description: description.trim() || null,
        storage_path: path,
        mime_type: mime,
        size,
        share_with_partners: share,
        status: "pending",
      });
      if (insErr) throw insErr;

      toast.success("Submitted for approval");
      setOpen(false); setTitle(""); setDescription(""); setFile(null); setTextBody(""); setShare(false);
      await loadSubmissions(salespersonId);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteMine(sub: Submission) {
    if (sub.status !== "pending") return;
    if (!confirm("Delete this pending submission?")) return;
    await supabase.storage.from("partner-marketing").remove([sub.storage_path]);
    const { error } = await supabase.from("partner_marketing_submissions").delete().eq("id", sub.id);
    if (error) { toast.error(error.message); return; }
    if (salespersonId) await loadSubmissions(salespersonId);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  const shareLink = `https://app.inreco.co.za/?ref=${referralCode}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Link to="/partner" className="font-bold">← Partner Portal</Link>
          <span className="text-xs text-muted-foreground font-mono">{referralCode}</span>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <BackHomeBar homeTo="/partner" />
        <div>
          <h1 className="text-3xl font-bold">Marketing kit</h1>
          <p className="text-muted-foreground mt-1">
            Every asset works with your unique referral link:
            <span className="font-mono block mt-1 text-sm">{shareLink}</span>
          </p>
        </div>

        <div className="rounded-md border-l-4 border-amber-500 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400">Rules for your own adverts</p>
          <p className="mt-1 text-foreground/90">
            You may create your own ads, but any advert mentioning iNRECO
            <b> must be approved by admin before you use it</b>. Upload it below — you'll see it appear
            here as "Approved" once we've checked it. Running unapproved ads breaches the Partner Agreement.
          </p>
        </div>

        <Tabs defaultValue="official">
          <TabsList>
            <TabsTrigger value="official">Official kit</TabsTrigger>
            <TabsTrigger value="community">
              Community kit {community.length > 0 && <Badge variant="secondary" className="ml-2">{community.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="mine">
              My submissions {mine.length > 0 && <Badge variant="secondary" className="ml-2">{mine.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="official" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Approved iNRECO assets</CardTitle></CardHeader>
              <CardContent>
                {official.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Marketing artwork is being prepared and will appear here shortly.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {official.map((a) => (
                      <li key={a.name} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{Math.max(1, Math.round(a.size / 1024))} KB</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => download(`official/${a.name}`)}>Download</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="community" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Shared by other partners</CardTitle></CardHeader>
              <CardContent>
                {community.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shared community assets yet.</p>
                ) : (
                  <ul className="divide-y">
                    {community.map((s) => (
                      <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.title}</div>
                          {s.description && <div className="text-xs text-muted-foreground truncate">{s.description}</div>}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => download(s.storage_path)}>Download</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Upload className="h-4 w-4 mr-2" />Upload my own material</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Submit for approval</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. WhatsApp opener" />
                    </div>
                    <div>
                      <Label>Short description (optional)</Label>
                      <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div>
                      <Label>Attach file (image / video / PDF, up to 25 MB)</Label>
                      <Input type="file" accept="image/*,video/*,application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div className="text-center text-xs text-muted-foreground">— OR —</div>
                    <div>
                      <Label>Text-only ad / message</Label>
                      <Textarea rows={4} value={textBody} onChange={(e) => setTextBody(e.target.value)}
                        placeholder="Paste the message you'd share on WhatsApp/social..." />
                    </div>
                    <div className="flex items-start gap-2 pt-2">
                      <Checkbox id="share" checked={share} onCheckedChange={(v) => setShare(!!v)} />
                      <Label htmlFor="share" className="text-sm font-normal leading-snug">
                        Allow other approved partners to use this material once approved by iNRECO admin
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancel</Button>
                    <Button onClick={submitUpload} disabled={uploading}>
                      {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Submit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {mine.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                You haven't submitted any material yet.
              </p>
            ) : mine.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.title}</span>
                      <StatusBadge status={s.status} />
                      {s.share_with_partners && <Badge variant="outline">Shared</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                    {s.description && <p className="text-sm mt-2 whitespace-pre-wrap">{s.description}</p>}
                    {s.reject_reason && (
                      <p className="text-xs text-destructive mt-1">Reason: {s.reject_reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {s.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => download(s.storage_path)}>Download</Button>
                    )}
                    {s.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => deleteMine(s)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
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
