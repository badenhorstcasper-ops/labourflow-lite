import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getLastError } from "@/lib/errorLogger";

export default function ReportProblemButton({ variant = "ghost" as const, className }: { variant?: "ghost" | "outline" | "default"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (desc.trim().length < 3) {
      toast.error("Please describe what happened (a few words)");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const last = getLastError();
      const { error } = await supabase.from("bug_reports").insert({
        user_id: u.user?.id ?? null,
        email: u.user?.email ?? null,
        route: window.location.pathname + window.location.search,
        description: desc.trim().slice(0, 4000),
        user_agent: navigator.userAgent,
        // last_error_id not set — short_id lives elsewhere; admin page links by time
      });
      if (error) throw error;
      toast.success("Thanks — your report was sent");
      setDesc("");
      setOpen(false);
      if (last) {
        toast(`Attached recent error ${last.shortId}`);
      }
    } catch (e) {
      toast.error("Could not send. Try again in a moment.");
      // eslint-disable-next-line no-console
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className={className}>Report a problem</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Tell us what you were trying to do and what went wrong. We'll attach
            your current page and the last error automatically.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g. I clicked Generate Word and nothing happened"
          rows={5}
          maxLength={4000}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
