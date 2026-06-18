import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { generateDocument, type GenerateResult } from "@/lib/documents";
import { TEMPLATE_REGISTRY, getTemplate } from "@/lib/documents/templates";
import ChairpersonOffer from "@/components/ChairpersonOffer";

export default function GeneratePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const templateKey = params.get("template") || "";
  const tpl = useMemo(() => getTemplate(templateKey), [templateKey]);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  useEffect(() => {
    // reset form when template changes
    setValues({});
    setResult(null);
  }, [templateKey]);

  if (authed === false) {
    return (
      <AppShell>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p>Sign in to generate documents.</p>
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  // ---- Template picker ----
  if (!tpl) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Generate a document</h1>
            <p className="text-sm text-muted-foreground">
              Pick a template. Every document uses your company branding and the iNRECO house style.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {TEMPLATE_REGISTRY.map((t) => (
              <Card key={t.key} className="hover:border-primary/60 transition cursor-pointer"
                onClick={() => setParams({ template: t.key })}>
                <CardHeader>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <Button variant="link" className="px-0 mt-2" onClick={(e) => { e.stopPropagation(); setParams({ template: t.key }); }}>
                    Use this template →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Per-template form ----
  function setField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onGenerate() {
    if (!tpl) return;
    const missing = tpl.fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      const built = tpl.build(values);
      const r = await generateDocument(built);
      setResult(r);
      toast.success("Document generated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Generation failed: " + msg);
    } finally {
      setBusy(false);
    }
  }

  async function download(url: string | null | undefined) {
    if (!url) return;
    window.open(url, "_blank");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              <button onClick={() => setParams({})} className="underline">All templates</button>
              {" / "}{tpl.name}
            </p>
            <h1 className="text-2xl font-bold">{tpl.name}</h1>
            <p className="text-sm text-muted-foreground">{tpl.description}</p>
          </div>
        </div>

        {result ? (
          <>
            <Card className="border-primary/40 bg-primary/10">
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="font-semibold">Document {result.doc_number} ready</p>
                  <p className="text-xs text-muted-foreground break-all">Share link: {result.share_url}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.pdf_url && <Button onClick={() => download(result.pdf_url)}>Download PDF</Button>}
                  {result.docx_url && <Button variant="outline" onClick={() => download(result.docx_url)}>Download DOCX</Button>}
                  <Button variant="outline" onClick={async () => {
                    await navigator.clipboard.writeText(result.share_url);
                    toast.success("Share link copied");
                  }}>Copy share link</Button>
                  <Button variant="outline" onClick={() => { setResult(null); setValues({}); }}>Generate another</Button>
                  <Button variant="ghost" onClick={() => navigate("/account-app/documents")}>View all documents →</Button>
                </div>
              </CardContent>
            </Card>
            {tpl?.key === "notice_hearing" && (
              <ChairpersonOffer documentId={result.id} employeeName={values.employee} />
            )}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-5 grid gap-4 md:grid-cols-2">
                {tpl.fields.map((f) => (
                  <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                    <Label>{f.label}{f.required && " *"}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        className="mt-1"
                        rows={4}
                        placeholder={f.placeholder}
                        value={values[f.key] || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    ) : f.type === "select" ? (
                      <Select value={values[f.key] || ""} onValueChange={(v) => setField(f.key, v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {f.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="mt-1"
                        type={f.type === "date" ? "date" : "text"}
                        placeholder={f.placeholder}
                        value={values[f.key] || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    )}
                    {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button onClick={onGenerate} disabled={busy}>
                {busy ? "Generating…" : "Generate document"}
              </Button>
              <Button variant="outline" onClick={() => setParams({})}>Back to templates</Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
