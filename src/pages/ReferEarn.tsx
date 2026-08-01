import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { inviteLinkFor, inviteShareText } from "@/lib/referral";

type Summary = {
  signups: number;
  conversions: number;
  credit_available: number;
  credit_earned_total: number;
  credit_this_month: number;
  monthly_cap: number;
};

const money = (n: number) => `R${Number(n || 0).toFixed(2)}`;

export default function ReferEarn() {
  const [code, setCode] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: codeData, error } = await supabase.rpc("get_or_create_referral_code");
      if (error) {
        toast.error("Could not load your invite link. Please refresh.");
        setLoading(false);
        return;
      }
      const value = codeData as unknown as string;
      setCode(value);
      try {
        setQr(await QRCode.toDataURL(inviteLinkFor(value), { width: 320, margin: 1 }));
      } catch (_) { /* QR is a nice-to-have */ }
      const { data: sum } = await supabase.rpc("referral_summary");
      setSummary(sum as unknown as Summary);
      setLoading(false);
    })();
  }, []);

  const link = code ? inviteLinkFor(code) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied — paste it anywhere.");
    } catch (_) {
      window.prompt("Copy your invite link:", link);
    }
  };

  const whatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteShareText(link))}`, "_blank", "noopener");
  };

  const shareSheet = async () => {
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "iNRECO Pocket Consultant", text: inviteShareText(link), url: link });
        return;
      } catch (_) { /* cancelled */ }
    }
    await copy();
  };

  return (
    <AppShell>
      <Seo
        title="Refer & Earn — iNRECO Pocket Consultant"
        description="Share your invite link, give a friend a 14-day free trial, and earn account credit when they subscribe."
        path="/account-app/refer"
      />
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Refer &amp; Earn</h1>
          <p className="mt-1 text-muted-foreground">
            Share your link. They get an extended free trial. You get account credit when they subscribe.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Your personal invite link</CardTitle>
            <CardDescription>
              Anyone who joins through this link starts on a 14-day free trial instead of 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                readOnly
                aria-label="Your invite link"
                value={loading ? "Loading…" : link}
                className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                onFocus={(e) => e.currentTarget.select()}
              />
              <div className="flex gap-2">
                <Button onClick={copy} disabled={!code} className="shrink-0">
                  <Copy className="mr-2 h-4 w-4" /> Copy link
                </Button>
                <Button onClick={whatsapp} variant="secondary" disabled={!code} className="shrink-0">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
                <Button onClick={shareSheet} variant="outline" disabled={!code} className="shrink-0" aria-label="Share">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {qr && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <img src={qr} alt="QR code for your personal iNRECO invite link" className="h-44 w-44 rounded-md border border-border bg-white p-2" />
                <span className="text-xs text-muted-foreground">Let someone scan this with their phone camera.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Signed up with your link</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-bold">{summary?.signups ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Now on a paid plan</CardDescription></CardHeader>
            <CardContent><p className="text-3xl font-bold">{summary?.conversions ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Referral credit available</CardDescription></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{money(summary?.credit_available ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {money(summary?.credit_this_month ?? 0)} of {money(summary?.monthly_cap ?? 500)} earned this month
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How the reward works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>You earn nothing from a signup on its own — the credit lands when your friend&apos;s trial turns into a real paid subscription:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Solo — R50 credit</li>
              <li>Business — R100 credit</li>
              <li>Professional — R150 credit</li>
              <li>Enterprise — R250 credit</li>
            </ul>
            <p>
              Credit is applied automatically to your next payment, up to {money(summary?.monthly_cap ?? 500)} per calendar month.
              Rewards are for genuine new customers only and may be withheld or reversed where a referral looks
              self-referred or abusive.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
