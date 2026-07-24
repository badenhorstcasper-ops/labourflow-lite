import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Asset = { name: string; size: number };

export default function PartnerMarketing() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav("/auth?redirect=/partner/marketing"); return; }

      const uid = session.user.id;
      const { data: sp } = await supabase
        .from("salespersons")
        .select("referral_code, status")
        .or(`user_id.eq.${uid},email.eq.${session.user.email?.toLowerCase() ?? ""}`)
        .maybeSingle();

      if (!sp || (sp.status !== "active" && sp.status !== "notice")) {
        toast.error("Marketing kit is only available to approved partners.");
        nav("/partner");
        return;
      }
      setReferralCode(sp.referral_code);

      const { data: files } = await supabase.storage.from("partner-marketing").list("", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });
      setAssets(
        (files ?? [])
          .filter((f) => f.name && !f.name.startsWith("."))
          .map((f) => ({ name: f.name, size: f.metadata?.size ?? 0 }))
      );
      setLoading(false);
    })();
  }, [nav]);

  async function downloadAsset(name: string) {
    const { data, error } = await supabase.storage.from("partner-marketing").createSignedUrl(name, 60);
    if (error || !data?.signedUrl) { toast.error("Could not prepare download."); return; }
    window.open(data.signedUrl, "_blank");
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
        <div>
          <h1 className="text-3xl font-bold">Marketing kit</h1>
          <p className="text-muted-foreground mt-1">
            Download the approved iNRECO artwork. Every asset works with your unique referral link:
            <span className="font-mono block mt-1 text-sm">{shareLink}</span>
          </p>
        </div>

        <div className="rounded-md border-l-4 border-amber-500 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-400">Rules for your own adverts</p>
          <p className="mt-1 text-foreground/90">
            You are welcome to create your own ads. Any self-created advert that mentions iNRECO
            <b> must be emailed to <a className="underline" href="mailto:info@inreco.co.za">info@inreco.co.za</a> for written approval BEFORE you use it</b>.
            Running unapproved ads is a breach of the Partner Agreement and will result in immediate termination of your referral code.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Approved assets</CardTitle></CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Marketing artwork is being prepared and will appear here shortly.</p>
                <p>In the meantime, share your referral link directly on WhatsApp, email or your favourite social channel.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {assets.map((a) => (
                  <li key={a.name} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{Math.max(1, Math.round(a.size / 1024))} KB</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadAsset(a.name)}>Download</Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ready-made messages</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Copy any of the messages below and share on WhatsApp, email, or social media.</p>
            {[
              `Are you an employer struggling with SA labour law? iNRECO gives you an AI assistant + all the compliant documents you need. Try it free for 7 days: ${shareLink}`,
              `Warnings, contracts, disciplinary letters — done properly, in minutes. iNRECO handles SA labour compliance from your phone. Start free: ${shareLink}`,
              `POPIA, BCEA, LRA — iNRECO turns the whole thing into simple, plain-language help for small business owners. 7 days free: ${shareLink}`,
            ].map((msg) => (
              <div key={msg} className="border rounded-md p-3 space-y-2">
                <p className="whitespace-pre-wrap">{msg}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(msg); toast.success("Copied"); }}
                >Copy</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
