import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ShareData = {
  title: string;
  doc_number: string;
  doc_type: string;
  created_at: string;
  expires_at: string;
  company: { company_name?: string; trading_name?: string; logo_url?: string; accent_color?: string } | null;
  pdf_url: string | null;
  docx_url: string | null;
};

const FN_URL =
  (import.meta.env.VITE_SUPABASE_URL || "") + "/functions/v1/get-shared-document";
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [data, setData] = useState<ShareData | null>(null);
  const [errorMsg, setErrorMsg] = useState("This link is not available.");

  useEffect(() => {
    if (!token) return;
    fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const map: Record<string, string> = {
            not_found: "This document link does not exist.",
            expired: "This share link has expired.",
            revoked: "The owner revoked this share link.",
            invalid_token: "Invalid link.",
          };
          setErrorMsg(map[j.error] || "Unable to load document.");
          setState("error");
          return;
        }
        setData(j as ShareData);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center space-y-2">
          <h1 className="text-lg font-semibold">Link unavailable</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
        </CardContent></Card>
      </div>
    );
  }
  const c = data.company || {};
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="border-b py-4 px-6 flex items-center gap-3"
        style={{ borderBottomColor: c.accent_color || undefined, borderBottomWidth: 3 }}
      >
        {c.logo_url && <img src={c.logo_url} alt="" className="h-10 w-auto" />}
        <div className="font-semibold">{c.company_name || "Shared document"}</div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {data.doc_type} · {data.doc_number}
              </div>
              <h1 className="text-2xl font-bold mt-1">{data.title}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Generated {new Date(data.created_at).toLocaleDateString()} ·
                Link expires {new Date(data.expires_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {data.pdf_url && (
                <Button asChild>
                  <a href={data.pdf_url} target="_blank" rel="noreferrer">Download PDF</a>
                </Button>
              )}
              {data.docx_url && (
                <Button asChild variant="outline">
                  <a href={data.docx_url} target="_blank" rel="noreferrer">Download Word (.docx)</a>
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground pt-4 border-t">
              Shared securely via iNRECO.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
