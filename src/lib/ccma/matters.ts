// Data access for the CCMA deadline tracker (RLS: account owner + active team members).
import { supabase } from "@/integrations/supabase/client";
import {
  computeDeadline,
  daysLeft,
  normaliseReminderDays,
  todaySAST,
  urgencyFor,
  type DisputeType,
  type Urgency,
} from "@/lib/ccma/deadlines";

export type MatterStatus = "open" | "done" | "withdrawn";

export interface Matter {
  id: string;
  owner_user_id: string;
  created_by_user_id: string;
  title: string;
  employee_name: string | null;
  case_number: string | null;
  dispute_type: DisputeType;
  trigger_date: string | null;
  custom_due_date: string | null;
  due_date: string;
  status: MatterStatus;
  completed_at: string | null;
  reminder_days: number[];
  email_reminders: boolean;
  reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatterInput {
  title: string;
  employee_name?: string | null;
  case_number?: string | null;
  dispute_type: DisputeType;
  trigger_date?: string | null;
  custom_due_date?: string | null;
  reminder_days: number[];
  email_reminders: boolean;
  notes?: string | null;
}

export interface ReminderRow {
  id: string;
  matter_id: string;
  due_date: string;
  stage: number;
  days_left: number;
  read_at: string | null;
  created_at: string;
}

export function withCountdown(m: Matter, today = todaySAST()): Matter & { daysLeft: number; urgency: Urgency } {
  const d = daysLeft(m.due_date, today);
  return { ...m, daysLeft: d, urgency: urgencyFor(d, m.status) };
}

/** Validates and builds the row we send. The database recomputes due_date itself. */
export function toRow(input: MatterInput) {
  const title = input.title.trim();
  if (!title) throw new Error("Give the matter a short name, e.g. the employee's name.");
  const isCustom = input.dispute_type === "custom";
  const { dueDate } = computeDeadline(input.dispute_type, input.trigger_date ?? null, input.custom_due_date ?? null);
  return {
    title: title.slice(0, 160),
    employee_name: input.employee_name?.trim() || null,
    case_number: input.case_number?.trim() || null,
    dispute_type: input.dispute_type,
    trigger_date: isCustom ? (input.trigger_date || null) : input.trigger_date!,
    custom_due_date: isCustom ? input.custom_due_date! : null,
    due_date: dueDate,
    reminder_days: normaliseReminderDays(input.reminder_days),
    email_reminders: input.email_reminders,
    notes: input.notes?.trim() || null,
  };
}

export async function listMatters(): Promise<Matter[]> {
  const { data, error } = await supabase
    .from("ccma_matters")
    .select("*")
    .order("due_date", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Matter[];
}

export async function createMatter(input: MatterInput): Promise<Matter> {
  const { data, error } = await supabase.from("ccma_matters").insert(toRow(input)).select("*").single();
  if (error) throw error;
  return data as Matter;
}

export async function updateMatter(id: string, input: MatterInput): Promise<Matter> {
  const { data, error } = await supabase.from("ccma_matters").update(toRow(input)).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Matter;
}

export async function setMatterStatus(id: string, status: MatterStatus): Promise<Matter> {
  const { data, error } = await supabase.from("ccma_matters").update({ status }).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Matter;
}

export async function deleteMatter(id: string): Promise<void> {
  const { data, error } = await supabase.from("ccma_matters").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("This deadline could not be deleted.");
}

export async function listUnreadReminders(): Promise<ReminderRow[]> {
  const { data, error } = await supabase
    .from("ccma_deadline_reminders")
    .select("id, matter_id, due_date, stage, days_left, read_at, created_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ReminderRow[];
}

export async function markRemindersRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("ccma_deadline_reminders")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}
