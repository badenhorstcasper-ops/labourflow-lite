import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEADLINE_RULES, DISPUTE_TYPES, addMonths, computeDeadline, countdownText, daysLeft,
  easterSunday, normaliseReminderDays, reminderStage, rollForward, saPublicHolidays,
  todaySAST, urgencyFor, weekday, isYmd,
} from "@/lib/ccma/deadlines";
import { toRow } from "@/lib/ccma/matters";

describe("unfair dismissal — 30 days (LRA s191(1)(b)(i))", () => {
  it("first day excluded: dismissed 1 Nov -> due 1 Dec", () => {
    expect(computeDeadline("unfair_dismissal", "2026-11-01").dueDate).toBe("2026-12-01");
  });
  it("crosses month and year ends", () => {
    expect(computeDeadline("unfair_dismissal", "2026-12-15").dueDate).toBe("2027-01-14");
    expect(computeDeadline("unfair_dismissal", "2027-01-31").dueDate).toBe("2027-03-02");
  });
  it("handles leap years", () => {
    expect(computeDeadline("unfair_dismissal", "2028-02-10").dueDate).toBe("2028-03-11");
    expect(computeDeadline("unfair_dismissal", "2027-02-10").dueDate).toBe("2027-03-12");
  });
  it("is a statutory (Interpretation Act) period", () => {
    expect(DEADLINE_RULES.unfair_dismissal.rollRule).toBe("interpretation_act");
    expect(DEADLINE_RULES.unfair_dismissal.source).toMatch(/s191\(1\)\(b\)\(i\)/);
  });
});

describe("other dispute types", () => {
  it("unfair labour practice: 90 days", () => {
    expect(computeDeadline("unfair_labour_practice", "2026-01-15").dueDate).toBe("2026-04-15");
  });
  it("unfair discrimination: 6 calendar months, clamped to month end", () => {
    expect(computeDeadline("unfair_discrimination", "2026-03-10").dueDate).toBe("2026-09-10");
    expect(computeDeadline("unfair_discrimination", "2026-08-31").dueDate).toBe("2027-02-28");
    expect(computeDeadline("unfair_discrimination", "2027-08-31").dueDate).toBe("2028-02-29");
  });
  it("conciliation period: 30 days, never rolled (not a filing deadline)", () => {
    const r = computeDeadline("conciliation_period", "2026-10-09"); // +30 = Sun 8 Nov
    expect(r.dueDate).toBe("2026-11-08");
    expect(r.mayExtendTo).toBeNull();
  });
  it("arbitration request: 90 days after the certificate", () => {
    expect(computeDeadline("arbitration_request", "2026-11-06").dueDate).toBe("2027-02-04");
  });
  it("rescission: 14 days (CCMA rule 32)", () => {
    expect(computeDeadline("rescission", "2026-11-02").dueDate).toBe("2026-11-16");
  });
  it("review: 6 weeks = 42 days (LRA s145(1)(a))", () => {
    expect(computeDeadline("review_award", "2026-11-06").dueDate).toBe("2026-12-18");
  });
  it("custom uses the date given", () => {
    expect(computeDeadline("custom", null, "2026-12-01").dueDate).toBe("2026-12-01");
    expect(() => computeDeadline("custom", null, null)).toThrow();
  });
  it("rejects missing or impossible start dates", () => {
    expect(() => computeDeadline("unfair_dismissal", null)).toThrow();
    expect(() => computeDeadline("unfair_dismissal", "2026-02-30")).toThrow();
    expect(isYmd("2026-02-29")).toBe(false);
    expect(isYmd("2028-02-29")).toBe(true);
  });
  it("every listed type has a rule or is custom", () => {
    for (const t of DISPUTE_TYPES) if (t !== "custom") expect(DEADLINE_RULES[t]).toBeDefined();
  });
});

describe("last day on a Sunday / Saturday / public holiday (informational only)", () => {
  it("statutory period: Sunday last day may move to Monday", () => {
    const r = computeDeadline("unfair_dismissal", "2026-10-09"); // +30 = Sun 8 Nov 2026
    expect(weekday(r.dueDate)).toBe(0);
    expect(r.dueDate).toBe("2026-11-08");
    expect(r.mayExtendTo).toBe("2026-11-09");
  });
  it("statutory period: Saturday is NOT skipped (Interpretation Act s4)", () => {
    const r = computeDeadline("unfair_dismissal", "2026-10-08"); // +30 = Sat 7 Nov
    expect(weekday(r.dueDate)).toBe(6);
    expect(r.mayExtendTo).toBeNull();
  });
  it("CCMA-rule period: Saturday IS skipped (rule 3)", () => {
    const r = computeDeadline("rescission", "2026-10-24"); // +14 = Sat 7 Nov
    expect(r.dueDate).toBe("2026-11-07");
    expect(r.mayExtendTo).toBe("2026-11-09");
  });
  it("public holiday: Day of Reconciliation", () => {
    const r = computeDeadline("unfair_dismissal", "2026-11-16"); // +30 = Wed 16 Dec
    expect(r.dueDate).toBe("2026-12-16");
    expect(r.mayExtendTo).toBe("2026-12-17");
  });
  it("chains over Christmas, Day of Goodwill and a Sunday", () => {
    expect(rollForward("2026-12-25", "interpretation_act")).toBe("2026-12-28");
    expect(rollForward("2026-12-25", "ccma_rule_3")).toBe("2026-12-28");
  });
  it("stored due date is never the extended one (conservative)", () => {
    const row = toRow({ title: "x", dispute_type: "unfair_dismissal", trigger_date: "2026-10-09", reminder_days: [7], email_reminders: true });
    expect(row.due_date).toBe("2026-11-08");
  });
});

describe("SA public holidays", () => {
  it("Easter dates", () => {
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });
  it("2026: Sunday holiday moves to Monday; Saturday holiday does not", () => {
    const h = saPublicHolidays(2026);
    for (const d of ["2026-01-01", "2026-03-21", "2026-04-03", "2026-04-06", "2026-04-27", "2026-05-01",
      "2026-06-16", "2026-08-09", "2026-08-10", "2026-09-24", "2026-12-16", "2026-12-25", "2026-12-26"]) {
      expect(h.has(d), d).toBe(true);
    }
    expect(h.has("2026-03-23")).toBe(false); // 21 Mar 2026 is a Saturday — no Monday holiday
  });
  it("2027: Day of Goodwill on Sunday -> Monday 27 Dec only", () => {
    const h = saPublicHolidays(2027);
    expect(h.has("2027-12-25")).toBe(true);
    expect(h.has("2027-12-27")).toBe(true);
    expect(h.has("2027-12-28")).toBe(false);
    expect(h.has("2027-03-22")).toBe(true);
  });
});

describe("countdown and reminders", () => {
  it("today in SAST, not UTC", () => {
    expect(todaySAST(Date.parse("2026-11-06T21:59:00Z"))).toBe("2026-11-06");
    expect(todaySAST(Date.parse("2026-11-06T22:00:00Z"))).toBe("2026-11-07");
  });
  it("days left and urgency", () => {
    expect(daysLeft("2026-12-01", "2026-11-06")).toBe(25);
    expect(urgencyFor(25)).toBe("ok");
    expect(urgencyFor(7)).toBe("soon");
    expect(urgencyFor(3)).toBe("urgent");
    expect(urgencyFor(0)).toBe("today");
    expect(urgencyFor(-1)).toBe("overdue");
    expect(urgencyFor(-1, "done")).toBe("done");
    expect(countdownText(1)).toBe("Due tomorrow");
    expect(countdownText(-2)).toBe("2 days overdue");
  });
  it("reminder stage: one reminder per offset, catches up after a missed day", () => {
    const s = [7, 3, 1];
    expect(reminderStage(10, s)).toBeNull();
    expect(reminderStage(7, s)).toBe(7);
    expect(reminderStage(5, s)).toBe(7); // same stage as day 7 -> no duplicate row
    expect(reminderStage(3, s)).toBe(3);
    expect(reminderStage(2, s)).toBe(3);
    expect(reminderStage(1, s)).toBe(1);
    expect(reminderStage(0, s)).toBe(0);
    expect(reminderStage(-1, s)).toBe(-1);
    expect(reminderStage(-8, s)).toBeNull();
    expect(reminderStage(0, [])).toBe(0);
    expect(reminderStage(2, [])).toBeNull();
  });
  it("normalises reminder schedules", () => {
    expect(normaliseReminderDays([1, 7, 7, "3", -1, 99, 2.5])).toEqual([7, 3, 1]);
    expect(normaliseReminderDays(undefined)).toEqual([7, 3, 1]);
  });
  it("addMonths behaves like Postgres date + interval", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-05-31", 6)).toBe("2026-11-30");
  });
});

describe("SQL mirror stays in sync", () => {
  const sql = readFileSync(
    resolve(__dirname, "../../supabase/migrations/20261106130000_ccma_deadline_tracker.sql"),
    "utf8",
  );
  it("ccma_compute_due_date uses the same periods", () => {
    for (const r of Object.values(DEADLINE_RULES)) {
      const line = sql.split("\n").find((l) => l.includes(`when '${r.type}'`));
      expect(line, r.type).toBeDefined();
      if (r.period.months) expect(line).toContain(`interval '${r.period.months} months'`);
      else expect(line).toMatch(new RegExp(`p_trigger \\+ ${r.period.days}\\b`));
    }
  });
  it("check constraint lists every type", () => {
    for (const t of DISPUTE_TYPES) expect(sql).toContain(`'${t}'`);
  });
});
