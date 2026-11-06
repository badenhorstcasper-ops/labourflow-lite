import { describe, it, expect } from "vitest";
import {
  computeEntitlement,
  decideAiAccess,
  decideProvisional,
  startOfMonthSAST,
  AI_HOURLY_LIMIT_PER_USER,
} from "@/lib/entitlement";

const NOW = Date.parse("2026-11-06T10:00:00Z");
const inH = (h: number) => new Date(NOW + h * 3600e3).toISOString();

describe("computeEntitlement", () => {
  it("no row -> no_subscription", () => {
    expect(computeEntitlement(null, { now: NOW })).toEqual({ entitled: false, reason: "no_subscription" });
  });
  it("admin always entitled", () => {
    expect(computeEntitlement(null, { isAdmin: true, now: NOW }).entitled).toBe(true);
  });
  it("future paid_until wins over any status", () => {
    expect(computeEntitlement({ status: "cancelled", paid_until: inH(24) }, { now: NOW }).reason).toBe("paid");
  });
  it("trial in the future is entitled, past is trial_ended", () => {
    expect(computeEntitlement({ status: "trialing", trial_ends_at: inH(5) }, { now: NOW }).reason).toBe("trial");
    expect(computeEntitlement({ status: "trialing", trial_ends_at: inH(-5) }, { now: NOW })).toEqual({
      entitled: false,
      reason: "trial_ended",
    });
  });
  it("expired provisional window locks even if status says active", () => {
    expect(
      computeEntitlement({ status: "active", provisional_until: inH(-1) }, { now: NOW }).reason,
    ).toBe("provisional_expired");
  });
  it("running provisional window is entitled", () => {
    expect(
      computeEntitlement({ status: "active", provisional_until: inH(10) }, { now: NOW }),
    ).toEqual({ entitled: true, reason: "provisional" });
  });
  it("active with a lapsed paid_until is expired", () => {
    expect(computeEntitlement({ status: "active", paid_until: inH(-1) }, { now: NOW }).entitled).toBe(false);
  });
  it("legacy active row without dates stays entitled", () => {
    expect(computeEntitlement({ status: "active" }, { now: NOW }).entitled).toBe(true);
  });
  it("expired / pending / cancelled are locked", () => {
    for (const status of ["expired", "pending", "cancelled"]) {
      expect(computeEntitlement({ status }, { now: NOW }).entitled).toBe(false);
    }
  });
});

describe("decideAiAccess", () => {
  const ok = { entitled: true, reason: "trial" } as const;
  const base = { usedThisMonthByAccount: 0, usedLastHourByUser: 0, usedLastDayByUser: 0 };
  it("blocks when not entitled", () => {
    const d = decideAiAccess({ ...base, entitlement: { entitled: false, reason: "trial_ended" }, planName: "Solo", kind: "chat" });
    expect(d).toEqual({ allowed: false, reason: "not_entitled" });
  });
  it("Solo gets 50 a month", () => {
    expect(decideAiAccess({ ...base, entitlement: ok, planName: "Solo", kind: "chat", usedThisMonthByAccount: 49 })).toEqual({
      allowed: true,
      remainingThisMonth: 0,
    });
    expect(decideAiAccess({ ...base, entitlement: ok, planName: "Solo", kind: "chat", usedThisMonthByAccount: 50 })).toMatchObject({
      allowed: false,
      reason: "monthly_limit",
    });
  });
  it("Business has no monthly cap but has the hourly fair-use limit", () => {
    expect(decideAiAccess({ ...base, entitlement: ok, planName: "Business", kind: "chat", usedThisMonthByAccount: 5000 })).toEqual({
      allowed: true,
      remainingThisMonth: null,
    });
    expect(
      decideAiAccess({ ...base, entitlement: ok, planName: "Business", kind: "chat", usedLastHourByUser: AI_HOURLY_LIMIT_PER_USER }),
    ).toMatchObject({ allowed: false, reason: "hourly_limit" });
  });
  it("admins skip limits", () => {
    expect(
      decideAiAccess({ ...base, entitlement: { entitled: true, reason: "admin" }, planName: "Solo", kind: "chat", usedThisMonthByAccount: 999, usedLastHourByUser: 999, usedLastDayByUser: 999 }),
    ).toEqual({ allowed: true, remainingThisMonth: null });
  });
  it("unknown plan names fall back to Solo's cap", () => {
    expect(decideAiAccess({ ...base, entitlement: ok, planName: "Mystery", kind: "chat", usedThisMonthByAccount: 50 })).toMatchObject({
      allowed: false,
    });
  });
});

describe("decideProvisional", () => {
  const base = { hadSubscriptionBefore: false, lastUnconfirmedGrantAt: null, now: NOW };
  it("confirmed payment always grants", () => {
    expect(decideProvisional({ ...base, payMode: "trial", txStatus: "complete", hadSubscriptionBefore: true }).grant).toBe(true);
  });
  it("cancelled / failed checkout never grants", () => {
    expect(decideProvisional({ ...base, payMode: "now", txStatus: "cancelled" }).grant).toBe(false);
    expect(decideProvisional({ ...base, payMode: "now", txStatus: "failed" }).grant).toBe(false);
  });
  it("abandoned trial-mode checkout cannot mint a second free week", () => {
    expect(decideProvisional({ ...base, payMode: "trial", txStatus: "pending", hadSubscriptionBefore: true })).toEqual({
      grant: false,
      reason: "trial_already_used",
    });
  });
  it("one unconfirmed grant per 30 days", () => {
    expect(
      decideProvisional({ ...base, payMode: "now", txStatus: "pending", lastUnconfirmedGrantAt: inH(-24 * 10) }).reason,
    ).toBe("provisional_recently_used");
    expect(
      decideProvisional({ ...base, payMode: "now", txStatus: "pending", lastUnconfirmedGrantAt: inH(-24 * 31) }).grant,
    ).toBe(true);
  });
});

describe("startOfMonthSAST", () => {
  it("is midnight on the 1st in South Africa", () => {
    expect(startOfMonthSAST(NOW)).toBe("2026-10-31T22:00:00.000Z");
    // 23:30 SAST on 30 Nov is still November
    expect(startOfMonthSAST(Date.parse("2026-11-30T21:30:00Z"))).toBe("2026-10-31T22:00:00.000Z");
    // 00:30 SAST on 1 Dec is December
    expect(startOfMonthSAST(Date.parse("2026-11-30T22:30:00Z"))).toBe("2026-11-30T22:00:00.000Z");
  });
});
