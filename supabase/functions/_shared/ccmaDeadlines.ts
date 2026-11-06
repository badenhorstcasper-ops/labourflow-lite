// CCMA / labour-dispute deadline rules and date maths.
//
// ONE source of truth: the React app re-exports this file (src/lib/ccma/deadlines.ts)
// and the edge function imports it directly. The SQL trigger
// public.ccma_compute_due_date() in migration 20261106130000 mirrors
// DEADLINE_RULES[type].period — src/test/ccmaDeadlines.test.ts checks they agree.
//
// This is general guidance, NOT legal advice. Time limits can be shortened,
// extended or condoned, a bargaining council (not the CCMA) may have
// jurisdiction, and the correct start date is often itself disputed.
//
// Pure TypeScript (no Deno / browser APIs) so it runs in Vitest, Vite and Deno.

export type DisputeType =
  | "unfair_dismissal"
  | "unfair_labour_practice"
  | "unfair_discrimination"
  | "conciliation_period"
  | "arbitration_request"
  | "rescission"
  | "review_award"
  | "custom";

/**
 * How the last day is treated if it lands on a non-working day.
 * - "interpretation_act": statutory periods (LRA, EEA). Interpretation Act 33 of 1957 s4:
 *   first day excluded, last day included unless it is a Sunday or public holiday,
 *   in which case the next day that is neither counts. Saturdays are NOT skipped.
 * - "ccma_rule_3": periods set by the CCMA Rules themselves (e.g. rule 32 rescission).
 *   Rule 3: calendar days, first day excluded, last day excluded if it falls on a
 *   Saturday, Sunday or public holiday -> next working day.
 * - "none": the date is an estimate/target, not a filing deadline.
 */
export type RollRule = "interpretation_act" | "ccma_rule_3" | "none";

export interface DeadlineRule {
  type: Exclude<DisputeType, "custom">;
  /** Short name shown in the picker. */
  label: string;
  /** What the user must enter as the start date. */
  triggerLabel: string;
  /** Help text for the start date. */
  triggerHelp: string;
  period: { days?: number; months?: number };
  /** Human period, e.g. "30 days". */
  periodLabel: string;
  /** What has to happen by the due date, and by whom. */
  dueLabel: string;
  /** Public source for the period. */
  source: string;
  rollRule: RollRule;
  /** Practical note for an employer. */
  employerNote: string;
}

export const DEADLINE_RULES: Record<Exclude<DisputeType, "custom">, DeadlineRule> = {
  unfair_dismissal: {
    type: "unfair_dismissal",
    label: "Unfair dismissal referral (30 days)",
    triggerLabel: "Date of dismissal",
    triggerHelp:
      "The dismissal date — or, if later, the date the employer made a final decision to dismiss or upheld the dismissal (e.g. the appeal outcome).",
    period: { days: 30 },
    periodLabel: "30 days",
    dueLabel: "Last day for the employee to refer the dismissal dispute to the CCMA or bargaining council",
    source: "Labour Relations Act 66 of 1995, s191(1)(b)(i)",
    rollRule: "interpretation_act",
    employerNote:
      "A referral after this date normally needs a condonation application (LRA s191(2)). Keep the dismissal letter, hearing record and proof of when the outcome was given.",
  },
  unfair_labour_practice: {
    type: "unfair_labour_practice",
    label: "Unfair labour practice referral (90 days)",
    triggerLabel: "Date of the act or omission",
    triggerHelp:
      "The date of the act or omission (e.g. promotion decision, suspension, benefit refusal) — or, if later, the date the employee became aware of it.",
    period: { days: 90 },
    periodLabel: "90 days",
    dueLabel: "Last day for the employee to refer the unfair labour practice dispute",
    source: "Labour Relations Act 66 of 1995, s191(1)(b)(ii)",
    rollRule: "interpretation_act",
    employerNote: "A later referral normally needs condonation (LRA s191(2)).",
  },
  unfair_discrimination: {
    type: "unfair_discrimination",
    label: "Unfair discrimination referral (6 months)",
    triggerLabel: "Date of the act or omission",
    triggerHelp: "The date of the alleged discriminatory act or omission.",
    period: { months: 6 },
    periodLabel: "6 months",
    dueLabel: "Last day to refer the unfair discrimination dispute to the CCMA",
    source: "Employment Equity Act 55 of 1998, s10(2)",
    rollRule: "interpretation_act",
    employerNote: "A later referral may be allowed on good cause shown (EEA s10(3)).",
  },
  conciliation_period: {
    type: "conciliation_period",
    label: "30-day conciliation period",
    triggerLabel: "Date the CCMA received the referral",
    triggerHelp: "The date the referral was received by the CCMA or bargaining council (see the referral / case acknowledgement).",
    period: { days: 30 },
    periodLabel: "30 days",
    dueLabel:
      "End of the 30-day conciliation period (unless the parties agree in writing to extend it) — after this, the dispute can move to arbitration or the Labour Court",
    source: "Labour Relations Act 66 of 1995, s135(2) and s191(5)",
    rollRule: "none",
    employerNote: "This is not a filing deadline for you — it tells you when the next stage can start.",
  },
  arbitration_request: {
    type: "arbitration_request",
    label: "Request arbitration after failed conciliation (90 days)",
    triggerLabel: "Date on the certificate of outcome",
    triggerHelp: "The date the commissioner certified that the dispute remains unresolved (certificate of outcome).",
    period: { days: 90 },
    periodLabel: "90 days",
    dueLabel: "Last day to request arbitration (or to refer the matter to the Labour Court, where that is the route)",
    source: "Labour Relations Act 66 of 1995, s136(1)(b) and s191(11)(a)",
    rollRule: "interpretation_act",
    employerNote: "A late request normally needs condonation.",
  },
  rescission: {
    type: "rescission",
    label: "Rescind / vary an award or ruling (14 days)",
    triggerLabel: "Date you became aware of the award or ruling",
    triggerHelp: "Usually the day the award or ruling reached you — e.g. a default award made when you were absent.",
    period: { days: 14 },
    periodLabel: "14 days",
    dueLabel: "Last day to apply to the CCMA to vary or rescind the award or ruling",
    source: "LRA s144, CCMA Rules rule 32 (2023 Rules as amended in October 2026 — confirm against the current Rules)",
    rollRule: "ccma_rule_3",
    employerNote: "The application must be served on the other party and filed with the CCMA, with a condonation application if late.",
  },
  review_award: {
    type: "review_award",
    label: "Labour Court review of an arbitration award (6 weeks)",
    triggerLabel: "Date the award was served on you",
    triggerHelp: "The date the arbitration award was served on (delivered to) your business.",
    period: { days: 42 },
    periodLabel: "6 weeks",
    dueLabel: "Last day to apply to the Labour Court to review and set aside the award",
    source: "Labour Relations Act 66 of 1995, s145(1)(a)",
    rollRule: "interpretation_act",
    employerNote:
      "Reviews are technical — speak to a labour lawyer early. Where the alleged defect is corruption, the 6 weeks run from discovery (s145(1)(b)).",
  },
};

export const DISPUTE_TYPES: DisputeType[] = [
  "unfair_dismissal",
  "unfair_labour_practice",
  "unfair_discrimination",
  "conciliation_period",
  "arbitration_request",
  "rescission",
  "review_award",
  "custom",
];

export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  ...Object.fromEntries(Object.values(DEADLINE_RULES).map((r) => [r.type, r.label])),
  custom: "Other / my own date",
} as Record<DisputeType, string>;

export const DEFAULT_REMINDER_DAYS = [7, 3, 1];
/** Choices offered in the UI (days before the due date). The due day itself is always reminded. */
export const REMINDER_DAY_OPTIONS = [14, 7, 3, 1];
export const MAX_REMINDER_DAYS = 60;
/** After the due date we remind once (stage -1), only within this many days. */
export const OVERDUE_REMINDER_WINDOW_DAYS = 7;

export const DISCLAIMER =
  "General guidance, not legal advice. Time limits can change, a bargaining council may have jurisdiction instead of the CCMA, and late referrals can sometimes be condoned. Check the dates with a labour-law practitioner before you rely on them.";

// ---------------------------------------------------------------------------
// Plain calendar dates as "YYYY-MM-DD" strings. All maths in UTC so no
// timezone or daylight-saving drift.

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isYmd(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = YMD.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function parse(ymd: string): Date {
  if (!isYmd(ymd)) throw new Error(`Invalid date: ${ymd}`);
  const m = YMD.exec(ymd)!;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: string, n: number): string {
  const d = parse(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Adds calendar months; clamps to the last day of the month (31 Aug + 6 months -> 28/29 Feb). Same as Postgres `date + interval 'n months'`. */
export function addMonths(ymd: string, n: number): string {
  const d = parse(ymd);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return fmt(new Date(Date.UTC(y, m, Math.min(day, last))));
}

export function diffDays(fromYmd: string, toYmd: string): number {
  return Math.round((parse(toYmd).getTime() - parse(fromYmd).getTime()) / 86400000);
}

/** Today's date in South Africa (UTC+2, no DST). */
export function todaySAST(now: number | Date = Date.now()): string {
  const t = typeof now === "number" ? now : now.getTime();
  return new Date(t + 2 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Day of week, 0 = Sunday. */
export function weekday(ymd: string): number {
  return parse(ymd).getUTCDay();
}

// ---------------------------------------------------------------------------
// South African public holidays (Public Holidays Act 36 of 1994).

/** Western (Gregorian) Easter Sunday — anonymous Gregorian algorithm. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const FIXED_HOLIDAYS = ["01-01", "03-21", "04-27", "05-01", "06-16", "08-09", "09-24", "12-16", "12-25", "12-26"];

/**
 * Statutory public holidays for a year, including the Monday that becomes a holiday
 * when a holiday falls on a Sunday (s2(1)). Ad-hoc holidays the President declares
 * (e.g. election days) are NOT included — see EXTRA_DECLARED_HOLIDAYS.
 */
export function saPublicHolidays(year: number): Set<string> {
  const out = new Set<string>();
  for (const md of FIXED_HOLIDAYS) {
    const d = `${year}-${md}`;
    out.add(d);
    if (weekday(d) === 0) out.add(addDays(d, 1));
  }
  const easter = easterSunday(year);
  out.add(addDays(easter, -2)); // Good Friday
  out.add(addDays(easter, 1)); // Family Day
  for (const d of EXTRA_DECLARED_HOLIDAYS) if (d.startsWith(`${year}-`)) out.add(d);
  return out;
}

/** Once-off public holidays declared under s2A of the Act. Add new ones here when gazetted. */
export const EXTRA_DECLARED_HOLIDAYS: string[] = [
  "2024-05-29", // national and provincial elections
];

export function isPublicHoliday(ymd: string): boolean {
  return saPublicHolidays(parse(ymd).getUTCFullYear()).has(ymd);
}

function isSkipped(ymd: string, rule: RollRule): boolean {
  if (rule === "none") return false;
  const wd = weekday(ymd);
  if (wd === 0) return true;
  if (rule === "ccma_rule_3" && wd === 6) return true;
  return isPublicHoliday(ymd);
}

/** Moves a last day that falls on an excluded day to the next counting day. */
export function rollForward(ymd: string, rule: RollRule): string {
  let d = ymd;
  for (let i = 0; i < 10 && isSkipped(d, rule); i++) d = addDays(d, 1);
  return d;
}

// ---------------------------------------------------------------------------

export interface DeadlineResult {
  /** Plain calendar due date — what we store, count down to and remind about. Conservative. */
  dueDate: string;
  /** Where the last day may move to if dueDate is a Sunday/public holiday (or Saturday for CCMA-rule periods). null if it doesn't move. */
  mayExtendTo: string | null;
  rule: DeadlineRule | null;
}

/**
 * Due date = start date + period, counting the first day as excluded (so a
 * dismissal on 1 Nov gives 1 Dec for 30 days). We store the UNEXTENDED date
 * as the deadline: acting by then is always safe. `mayExtendTo` is shown as
 * information only.
 */
export function computeDeadline(type: DisputeType, triggerDate: string | null, customDueDate?: string | null): DeadlineResult {
  if (type === "custom") {
    if (!isYmd(customDueDate)) throw new Error("A due date is required for your own deadline");
    return { dueDate: customDueDate, mayExtendTo: null, rule: null };
  }
  const rule = DEADLINE_RULES[type];
  if (!rule) throw new Error(`Unknown dispute type: ${type}`);
  if (!isYmd(triggerDate)) throw new Error(`${rule.triggerLabel} is required`);
  const due = rule.period.months ? addMonths(triggerDate, rule.period.months) : addDays(triggerDate, rule.period.days ?? 0);
  const rolled = rollForward(due, rule.rollRule);
  return { dueDate: due, mayExtendTo: rolled !== due ? rolled : null, rule };
}

export type Urgency = "overdue" | "today" | "urgent" | "soon" | "ok" | "done";

export function daysLeft(dueDate: string, today: string): number {
  return diffDays(today, dueDate);
}

export function urgencyFor(days: number, status: "open" | "done" | "withdrawn" = "open"): Urgency {
  if (status !== "open") return "done";
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "ok";
}

export function countdownText(days: number): string {
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

/** Cleans a user-supplied reminder schedule: whole days 0..60, unique, descending. */
export function normaliseReminderDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [...DEFAULT_REMINDER_DAYS];
  const out = Array.from(
    new Set(
      days
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= MAX_REMINDER_DAYS),
    ),
  ).sort((a, b) => b - a);
  return out;
}

/**
 * Which reminder "stage" is due today for an open deadline, or null.
 * Mirrors public.ccma_reminder_stage() in SQL:
 * - The due day (0) is always a stage.
 * - If daysLeft is within the schedule, the stage is the smallest offset >= daysLeft
 *   (so a missed cron run, or a deadline added late, still gets one reminder — not a burst).
 * - Overdue: stage -1, once, within OVERDUE_REMINDER_WINDOW_DAYS.
 */
export function reminderStage(days: number, schedule: number[]): number | null {
  if (days < 0) return days >= -OVERDUE_REMINDER_WINDOW_DAYS ? -1 : null;
  const offsets = Array.from(new Set([...normaliseReminderDays(schedule), 0]));
  const candidates = offsets.filter((o) => o >= days);
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export function stageText(stage: number): string {
  if (stage < 0) return "is overdue";
  if (stage === 0) return "is due today";
  if (stage === 1) return "is due tomorrow";
  return `is due within ${stage} days`;
}

/** "Tue 1 Dec 2026" — fixed English format, independent of the device locale. */
export function formatYmd(ymd: string): string {
  const d = parse(ymd);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
