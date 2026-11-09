import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { answerLegal2026, LEGAL_2026 } from "@/lib/cara/legal2026";
import { INDUSTRIES, needsRestaurantPack, sectorConfirmation } from "@/lib/industryMatch";
import { routeMessage } from "@/lib/cara/router";

describe("2026 legal facts", () => {
  it("uses the R30.23 wage from 1 March and Gazette 54075", () => {
    expect(LEGAL_2026.minimumWage).toMatchObject({ amount: 30.23, effective: "2026-03-01", gazette: "54075" });
  });
  it("flags the requested BCEA threshold discrepancy rather than certifying it", () => {
    expect(LEGAL_2026.bceaThreshold).toMatchObject({ requestedAmount: 269900.90, amount: 269600.90, effective: "2026-05-01", confirmationRequired: true });
  });
  it("uses the R668000 COIDA ceiling from 1 March", () => {
    expect(LEGAL_2026.coidaLimit).toMatchObject({ amount: 668000, effective: "2026-03-01" });
  });
  it("replaces the dismissal-code instrument", () => {
    expect(LEGAL_2026.dismissalCode).toBe("Code of Good Practice: Dismissal (Notice 3470, Gazette 53294, September 2025)");
  });
  it("sets rule 20 deadlines and AI disclosure", () => {
    expect(LEGAL_2026.ccma).toMatchObject({ meetingDays: 14, minutesDays: 7, discloseAi: true });
  });
  it("sets rule 29 disclosure deadlines", () => {
    expect(LEGAL_2026.ccma).toMatchObject({ documentRequestDays: 14, responseDays: 5 });
  });
  it("preserves discretionary dismissal for deliberate absence", () => {
    expect(LEGAL_2026.ccma.deliberateAbsenceMayDismiss).toBe(true);
  });
  it("sets rule 39 VAT-inclusive tariffs", () => {
    expect(LEGAL_2026.ccma).toMatchObject({ firstDayFee: 7524, subsequentDayFee: 4911.5, includesVat: true });
  });
  it("recognises WhatsApp and SMS", () => {
    expect(LEGAL_2026.ccma.deliveryChannels).toEqual(["WhatsApp", "SMS"]);
  });
});

describe("built-in-first, industry-first advice", () => {
  it("has all ten industry keys, retaining existing selections", () => {
    expect(INDUSTRIES.map((i) => i.value)).toEqual(["restaurant", "retail", "security", "cleaning", "domestic", "hospitality", "agriculture", "wholesale", "transport", "other"]);
  });
  it("does not let cook keywords override a supermarket profile", () => {
    expect(needsRestaurantPack("retail", "What must I pay a cook?")).toBe(false);
    expect(needsRestaurantPack("hospitality", "restaurant wages in my hotel")).toBe(false);
  });
  it("answers the national wage without calling the model even in a restaurant", () => {
    expect(routeMessage("What is the national minimum wage?", "restaurant").source).toBe("knowledge");
  });
  it("requires confirmation for unloaded security-sector wage tables", () => {
    expect(routeMessage("What wage rate must my guards receive?", "security").source).toBe("knowledge");
    expect(sectorConfirmation("security", "wage rate")).toBeDefined();
  });
  it("does not manufacture a verified answer for unknown case citations", () => {
    expect(answerLegal2026("Give me a court case about my unique dispute")).toBeUndefined();
  });
  it("keeps online and local legal data identical", () => {
    expect(readFileSync("src/lib/cara/legal2026.ts", "utf8")).toBe(readFileSync("supabase/functions/_shared/legal2026.ts", "utf8"));
    expect(readFileSync("src/lib/industryMatch.ts", "utf8")).toBe(readFileSync("supabase/functions/_shared/industry/match.ts", "utf8"));
  });
});