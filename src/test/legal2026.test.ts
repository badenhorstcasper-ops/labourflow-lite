import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { answerLegal2026, LEGAL_2026 } from "@/lib/cara/legal2026";
import { INDUSTRIES, needsRestaurantPack, sectorConfirmation } from "@/lib/industryMatch";
import { routeMessage } from "@/lib/cara/router";

describe("2026 legal facts", () => {
  it("uses the R30.23 wage from 1 March and Gazette 54075", () => {
    expect(LEGAL_2026.minimumWage).toMatchObject({ amount: 30.23, effective: "2026-03-01", gazette: "54075" });
  });
  it("uses the gazetted 2026 BCEA threshold (GN 7384, Gazette 54544)", () => {
    expect(LEGAL_2026.bceaThreshold).toMatchObject({ amount: 269600.90, effective: "2026-05-01", gazette: "54544", notice: "7384", confirmationRequired: false });
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
  it("restores the CCMA referral guide and its follow-ups", () => {
    const answer = routeMessage("An employee has referred us to the CCMA. What do I do?");
    expect(answer.source).toBe("knowledge");
    if (answer.source !== "knowledge") throw new Error("Expected the referral guide");
    expect(answer.topic.key).toBe("ccma");
    expect(answer.followUps).toContain("Can I be represented by an attorney at the CCMA?");
  });
  it.each([
    "Can I be represented by an attorney at the CCMA?",
    "What's the difference between conciliation and arbitration?",
    "How do I apply the Code of Good Practice: Dismissal to probation?",
    "Can I deduct money if pay falls below the minimum wage?",
  ])("does not replace a specific question with a legal summary: %s", (question) => {
    expect(answerLegal2026(question)).toBeUndefined();
  });
  it("retains the built-in October 2026 rules lookup", () => {
    expect(answerLegal2026("What changed in the October 2026 CCMA rules?")?.topicKey).toBe("ccma_rules_2026");
  });
  it("sends explicit requests for more detail to the adviser", () => {
    expect(answerLegal2026("What is the national minimum wage?", true)).toBeUndefined();
    expect(answerLegal2026("What changed in the October 2026 CCMA rules?", true)).toBeUndefined();
  });
  it("does not replace a sector minimum-wage question with the national floor", () => {
    expect(answerLegal2026("What is the minimum wage for a restaurant waiter?")).toBeUndefined();
    expect(routeMessage("What is the minimum wage for a restaurant waiter?", "restaurant").source).toBe("ai");
  });
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