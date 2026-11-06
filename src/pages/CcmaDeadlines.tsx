import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, CalendarClock, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEADLINE_RULES, DEFAULT_REMINDER_DAYS, DISCLAIMER, DISPUTE_TYPES, DISPUTE_TYPE_LABELS,
  REMINDER_DAY_OPTIONS, computeDeadline, countdownText, daysLeft, formatYmd, stageText, todaySAST,
  type DisputeType, type Urgency,
} from "@/lib/ccma/deadlines";
import {
  createMatter, deleteMatter, listMatters, listUnreadReminders, markRemindersRead,
  setMatterStatus, updateMatter, withCountdown,
  type Matter, type MatterInput, type ReminderRow,
} from "@/lib/ccma/matters";

const URGENCY_STYLE: Record<Urgency, string> = {
  overdue: "bg-destructive text-destructive-foreground",
  today: "bg-destructive text-destructive-foreground",
  urgent: "bg-warning text-warning-foreground",
  soon: "bg-warning text-warning-foreground",
  ok: "bg-teal-soft text-teal",
  done: "bg-muted text-muted-foreground",
};

const EMPTY: MatterInput = {
  title: "",
  employee_name: "",
  case_number: "",
  dispute_type: "unfair_dismissal",
  trigger_date: "",
  custom_due_date: "",
  reminder_days: DEFAULT_REMINDER_DAYS,
  email_reminders: true,
  notes: "",
};

function toInput(m: Matter): MatterInput {
  return {
    title: m.title,
    employee_name: m.employee_name ?? "",
    case_number: m.case_number ?? "",
    dispute_type: m.dispute_type,
    trigger_date: m.trigger_date ?? "",
    custom_due_date: m.custom_due_date ?? "",
    reminder_days: m.reminder_days ?? DEFAULT_REMINDER_DAYS,
    email_reminders: m.email_reminders,
    notes: m.notes ?? "",
  };
}

export default function CcmaDeadlinesPage() {
  const [rows, setRows] = useState<Matter[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Matter | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MatterInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Matter | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const today = todaySAST();

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [m, r] = await Promise.all([listMatters(), listUnreadReminders().catch(() => [])]);
      setRows(m);
      setReminders(r);
    } catch (e) {
      setLoadError((e as Error).message || "Could not load your deadlines.");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const open = useMemo(
    () => rows.filter((m) => m.status === "open").map((m) => withCountdown(m, today)).sort((a, b) => a.daysLeft - b.daysLeft),
    [rows, today],
  );
  const closed = useMemo(() => rows.filter((m) => m.status !== "open"), [rows]);
  const titleById = useMemo(() => new Map(rows.map((m) => [m.id, m.title])), [rows]);

  const preview = useMemo(() => {
    try {
      return computeDeadline(form.dispute_type, form.trigger_date || null, form.custom_due_date || null);
    } catch {
      return null;
    }
  }, [form.dispute_type, form.trigger_date, form.custom_due_date]);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function startEdit(m: Matter) {
    setEditing(m);
    setForm(toInput(m));
    setFormOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const saved = editing ? await updateMatter(editing.id, form) : await createMatter(form);
      setRows((prev) => (editing ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]));
      toast.success(editing ? "Deadline updated" : `Deadline saved — due ${formatYmd(saved.due_date)}`);
      setFormOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Could not save the deadline.");
    }
    setSaving(false);
  }

  async function changeStatus(m: Matter, status: Matter["status"]) {
    try {
      const saved = await setMatterStatus(m.id, status);
      setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      const mine = reminders.filter((r) => r.matter_id === m.id).map((r) => r.id);
      if (status !== "open" && mine.length) {
        await markRemindersRead(mine).catch(() => undefined);
        setReminders((prev) => prev.filter((r) => r.matter_id !== m.id));
      }
      toast.success(status === "done" ? "Marked as done — reminders stopped" : status === "open" ? "Reopened" : "Marked as withdrawn");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMatter(pendingDelete.id);
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setReminders((prev) => prev.filter((r) => r.matter_id !== pendingDelete.id));
      toast.success("Deadline deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
    setPendingDelete(null);
  }

  async function dismissReminders() {
    const ids = reminders.map((r) => r.id);
    setReminders([]);
    try { await markRemindersRead(ids); } catch { /* not critical */ }
  }

  const rule = form.dispute_type === "custom" ? null : DEADLINE_RULES[form.dispute_type];
  const toggleDay = (d: number, on: boolean) =>
    setForm((f) => ({
      ...f,
      reminder_days: on ? [...new Set([...f.reminder_days, d])] : f.reminder_days.filter((x) => x !== d),
    }));

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CCMA deadlines</h1>
            <p className="text-sm text-muted-foreground">
              Log the key date of a dispute. We work out the usual time limit, count down, and remind you in the app and by email.
            </p>
          </div>
          <Button onClick={startCreate} className="min-h-[44px]">
            <Plus className="mr-1 h-4 w-4" /> Add deadline
          </Button>
        </header>

        <Alert>
          <AlertTitle>Guidance, not legal advice</AlertTitle>
          <AlertDescription className="text-sm">{DISCLAIMER}</AlertDescription>
        </Alert>

        {reminders.length > 0 && (
          <Card className="border-warning-foreground/30 bg-warning/40" role="status">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <Bell className="h-4 w-4" /> {reminders.length} reminder{reminders.length === 1 ? "" : "s"}
                </p>
                <Button size="sm" variant="ghost" onClick={dismissReminders}>Dismiss</Button>
              </div>
              <ul className="space-y-1 text-sm text-foreground">
                {reminders.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{titleById.get(r.matter_id) ?? "A deadline"}</span>{" "}
                    {stageText(r.stage)} ({formatYmd(r.due_date)})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : loadError ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm text-foreground">We couldn't load your deadlines: {loadError}</p>
              <Button variant="outline" size="sm" onClick={load}>Try again</Button>
            </CardContent>
          </Card>
        ) : open.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-teal" />
              <p className="font-medium text-foreground">No open deadlines</p>
              <p className="text-sm text-muted-foreground">
                Dismissed someone, or received a CCMA referral or award? Add it here and we'll track the time limit.
              </p>
              <Button onClick={startCreate}>Add your first deadline</Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3" aria-label="Open deadlines">
            {open.map((m) => {
              const r = m.dispute_type === "custom" ? null : DEADLINE_RULES[m.dispute_type];
              let ext: string | null = null;
              try { ext = computeDeadline(m.dispute_type, m.trigger_date, m.custom_due_date).mayExtendTo; } catch { /* ignore */ }
              return (
                <li key={m.id}>
                  <Card className={cn(m.urgency === "overdue" || m.urgency === "today" ? "border-destructive/50" : "")}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {DISPUTE_TYPE_LABELS[m.dispute_type]}
                            {m.case_number ? ` · Case ${m.case_number}` : ""}
                          </p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", URGENCY_STYLE[m.urgency])}>
                          {countdownText(m.daysLeft)}
                        </span>
                      </div>
                      <div className="text-sm text-foreground">
                        <p><span className="text-muted-foreground">Due:</span> <strong>{formatYmd(m.due_date)}</strong></p>
                        {r && m.trigger_date && (
                          <p className="text-muted-foreground">{r.triggerLabel}: {formatYmd(m.trigger_date)} · {r.periodLabel} · {r.source}</p>
                        )}
                        {r && <p className="mt-1 text-muted-foreground">{r.dueLabel}.</p>}
                        {ext && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Falls on a weekend/public holiday — the last day may move to {formatYmd(ext)}. Don't rely on the extra time.
                          </p>
                        )}
                        {m.notes && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{m.notes}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reminders: {[...m.reminder_days.filter((d) => d > 0).map((d) => `${d}d`), "due day"].join(", ")} before
                          {m.email_reminders ? " · in app + email" : " · in app only"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => changeStatus(m, "done")}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark done
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(m)}>
                          <Pencil className="mr-1 h-4 w-4" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => changeStatus(m, "withdrawn")}>Withdrawn / not needed</Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {closed.length > 0 && (
          <section>
            <Button variant="ghost" size="sm" onClick={() => setShowClosed((v) => !v)}>
              {showClosed ? "Hide" : "Show"} closed ({closed.length})
            </Button>
            {showClosed && (
              <ul className="mt-2 space-y-2">
                {closed.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.status === "done" ? "Done" : "Withdrawn"} · was due {formatYmd(m.due_date)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => changeStatus(m, "open")} aria-label={`Reopen ${m.title}`}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(m)} aria-label={`Delete ${m.title}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="text-xs text-muted-foreground">
          Not sure which time limit applies? <Link to="/app" className="underline">Ask CARA</Link>. Full terms: <Link to="/disclaimer" className="underline">disclaimer</Link>.
        </p>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit deadline" : "Add a deadline"}</DialogTitle>
            <DialogDescription>We work out the due date from the start date. You can change it later.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ccma-type">What kind of deadline?</Label>
              <Select value={form.dispute_type} onValueChange={(v) => setForm((f) => ({ ...f, dispute_type: v as DisputeType }))}>
                <SelectTrigger id="ccma-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISPUTE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{DISPUTE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rule && <p className="text-xs text-muted-foreground">{rule.periodLabel} · {rule.source}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ccma-title">Name for this matter</Label>
              <Input id="ccma-title" maxLength={160} placeholder="e.g. J. Mokoena — dismissal" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            {rule ? (
              <div className="space-y-1.5">
                <Label htmlFor="ccma-trigger">{rule.triggerLabel}</Label>
                <Input id="ccma-trigger" type="date" value={form.trigger_date ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_date: e.target.value }))} />
                <p className="text-xs text-muted-foreground">{rule.triggerHelp}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="ccma-custom">Due date</Label>
                <Input id="ccma-custom" type="date" value={form.custom_due_date ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, custom_due_date: e.target.value }))} />
                <p className="text-xs text-muted-foreground">For any other date, e.g. a hearing, a set-down or a date in a CCMA notice.</p>
              </div>
            )}

            {preview && (
              <div className="rounded-xl border bg-teal-soft/50 p-3 text-sm text-foreground" aria-live="polite">
                <p><strong>Due {formatYmd(preview.dueDate)}</strong> · {countdownText(daysLeft(preview.dueDate, today))}</p>
                {rule && <p className="text-muted-foreground">{rule.dueLabel}.</p>}
                {preview.mayExtendTo && (
                  <p className="text-xs text-muted-foreground">Falls on a weekend/public holiday — may move to {formatYmd(preview.mayExtendTo)}. Act by the earlier date if you can.</p>
                )}
                {rule && <p className="mt-1 text-xs text-muted-foreground">{rule.employerNote}</p>}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ccma-employee">Employee (optional)</Label>
                <Input id="ccma-employee" maxLength={160} value={form.employee_name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, employee_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ccma-case">CCMA case number (optional)</Label>
                <Input id="ccma-case" maxLength={80} value={form.case_number ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, case_number: e.target.value }))} />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Remind me</legend>
              <div className="flex flex-wrap gap-3">
                {REMINDER_DAY_OPTIONS.map((d) => (
                  <label key={d} className="flex min-h-[44px] items-center gap-2 text-sm text-foreground">
                    <Checkbox checked={form.reminder_days.includes(d)} onCheckedChange={(v) => toggleDay(d, v === true)} />
                    {d} day{d === 1 ? "" : "s"} before
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">You're always reminded on the due day, and once if it passes while still open.</p>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-foreground">
                <Checkbox checked={form.email_reminders} onCheckedChange={(v) => setForm((f) => ({ ...f, email_reminders: v === true }))} />
                Also email me (to the address I sign in with)
              </label>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="ccma-notes">Notes (optional)</Label>
              <Textarea id="ccma-notes" maxLength={4000} rows={3} value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editing && (
              <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { setFormOpen(false); setPendingDelete(editing); }}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !preview || !form.title.trim()}>
              {saving ? "Saving…" : "Save deadline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deadline?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" and its reminders will be removed for everyone on your account. Use "Mark done" instead if you want to keep a record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
