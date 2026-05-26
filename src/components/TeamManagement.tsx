import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const SEAT_LIMITS: Record<string, number> = {
  Solo: 1,
  Business: 5,
  Professional: 10,
  Enterprise: 15,
};

type TeamMember = {
  id: string;
  member_email: string;
  status: "pending" | "active";
  invited_at: string;
  joined_at: string | null;
};

export function TeamManagement() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>("Solo");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const seatLimit = SEAT_LIMITS[planName] ?? 1;
  const seatsUsed = useMemo(() => members.length + 1, [members]); // owner counts
  const seatsRemaining = Math.max(0, seatLimit - seatsUsed);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;
    setUserId(uid);
    if (!uid) {
      setLoading(false);
      return;
    }
    const [{ data: sub }, { data: tm }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan_name")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("team_members")
        .select("id, member_email, status, invited_at, joined_at")
        .eq("owner_user_id", uid)
        .order("invited_at", { ascending: false }),
    ]);
    setPlanName(sub?.plan_name || "Solo");
    setMembers((tm as TeamMember[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-team-member", {
        body: { email: email.trim().toLowerCase() },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      toast({ title: "Invite sent", description: `Invitation sent to ${email}` });
      setEmail("");
      setOpen(false);
      await load();
    } catch (err) {
      toast({
        title: "Could not send invite",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) {
      toast({
        title: "Could not remove member",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Members</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!userId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Invite Team Members</CardTitle>
            <CardDescription>
              Current plan: <span className="font-medium text-foreground">{planName}</span>
              {" · "}
              {seatsUsed} of {seatLimit} seats used
              {seatsRemaining > 0 ? (
                <> · {seatsRemaining} remaining</>
              ) : (
                <> · no seats remaining</>
              )}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={seatsRemaining <= 0}>Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={sendInvite}>
                <DialogHeader>
                  <DialogTitle>Invite a team member</DialogTitle>
                  <DialogDescription>
                    They'll receive an email with a link to join your account.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    type="email"
                    required
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={sending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sending}>
                    {sending ? "Sending…" : "Send invite"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members yet. Use “Invite Member” to add someone.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.member_email}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "active" ? "default" : "secondary"}>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(m.invited_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => revoke(m.id)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamManagement;
