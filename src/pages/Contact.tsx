import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BackHomeBar from "@/components/BackHomeBar";
import Seo from "@/components/Seo";

const FN_URL =
  (import.meta.env.VITE_SUPABASE_URL || "") + "/functions/v1/submit-contact";
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export default function ContactPage() {
  const [params] = useSearchParams();
  const initialPlan = params.get("plan") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(initialPlan ? `${initialPlan} plan enquiry` : "");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Contact iNRECO";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON}`,
          apikey: ANON,
        },
        body: JSON.stringify({
          name,
          email,
          subject: subject || null,
          message,
          plan_interest: initialPlan || null,
          website,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const first =
          j?.errors && typeof j.errors === "object"
            ? Object.values(j.errors)[0]
            : "Could not send your message.";
        toast.error(String(first));
        return;
      }
      setDone(true);
      toast.success("Message sent. We'll be in touch soon.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (

    <Seo title="Contact iNRECO — labour compliance support" description="Send the iNRECO team a message about the Pocket Consultant app, subscriptions, chairperson bookings or South African labour compliance support." path="/contact" />    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <BackHomeBar homeTo="/" />
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Get in touch</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Questions about iNRECO, billing, or Enterprise plans? Send us a message.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Contact form</CardTitle>
            <CardDescription>
              We reply within one business day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4 text-center">
                <p className="text-sm">Thanks — your message is on its way.</p>
                <Button asChild variant="outline">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div style={{ position: "absolute", left: "-10000px" }} aria-hidden>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="subject">Subject (optional)</Label>
                  <Input id="subject" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" required maxLength={5000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
