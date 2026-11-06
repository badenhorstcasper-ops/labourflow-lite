import { describe, it, expect } from "vitest";
import { annualPrice, decideTrialOffer, offerFirstMonthPrice } from "@/lib/offers";

const DAY = 24 * 3600e3;
const NOW = Date.parse("2026-11-10T10:00:00Z");
const at = (days: number) => new Date(NOW + days * DAY).toISOString();

describe("annual pricing saves 20%", () => {
  it("Solo yearly is R2,486", () => expect(annualPrice("Solo")).toBe(2486));
  it("Business yearly is R5,750", () => expect(annualPrice("Business")).toBe(5750));
});

describe("trial offer: 20% off first month", () => {
  it("Business first month is R479", () => expect(offerFirstMonthPrice("Business")).toBe(479));
  it("open 2 days before trial ends", () => {
    expect(decideTrialOffer({ trialEndsAt: at(2), hasPaidBefore: false, now: NOW }).eligible).toBe(true);
  });
  it("closed 3 days before trial ends", () => {
    expect(decideTrialOffer({ trialEndsAt: at(3), hasPaidBefore: false, now: NOW }).eligible).toBe(false);
  });
  it("closed 8 days after a recent trial ended", () => {
    const later = Date.parse("2026-12-10T10:00:00Z");
    expect(decideTrialOffer({ trialEndsAt: new Date(later - 8 * DAY).toISOString(), hasPaidBefore: false, now: later }).eligible).toBe(false);
  });
  it("never for people who already paid", () => {
    expect(decideTrialOffer({ trialEndsAt: at(1), hasPaidBefore: true, now: NOW }).eligible).toBe(false);
  });
  it("old trials get welcome-back until 21 Nov", () => {
    const d = decideTrialOffer({ trialEndsAt: "2026-09-27T00:00:00Z", hasPaidBefore: false, now: NOW });
    expect(d).toMatchObject({ eligible: true, kind: "win_back" });
    const late = decideTrialOffer({ trialEndsAt: "2026-09-27T00:00:00Z", hasPaidBefore: false, now: Date.parse("2026-11-23T00:00:00Z") });
    expect(late.eligible).toBe(false);
  });
});
