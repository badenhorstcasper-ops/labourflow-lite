import { describe, it, expect } from "vitest";
import { needsRestaurantPack, sectorConfirmation } from "@/lib/industryMatch";
import { routeMessage } from "@/lib/cara/router";

describe("restaurant agreement knowledge", () => {
  it.each([
    "What must I pay a waiter?",
    "Under the restaurant bargaining council agreement, what is the minimum hourly wage I must pay a waiter right now?",
  ])("routes loaded waiter rates to the restaurant adviser: %s", (question) => {
    expect(sectorConfirmation("restaurant", question)).toBeUndefined();
    expect(routeMessage(question, "restaurant").source).toBe("ai");
  });
  it.each(["restaurant", "retail", "security", "transport"])("does not intercept salary deductions for %s", (industry) => {
    for (const [question, source] of [["Can I deduct traffic fines from an employee's salary?", "knowledge"], ["Can I recover the fines from their salary?", "ai"]]) {
      expect(sectorConfirmation(industry, question)).toBeUndefined();
      const answer = routeMessage(question, industry);
      expect(answer.source).toBe(source);
      if (answer.source === "knowledge") expect(answer.topic.key).not.toBe("sector_confirmation");
    }
  });
  it("keeps unverified security wage rates explicitly guarded", () => {
    expect(sectorConfirmation("security", "What wage rate must my guards receive?")).toBeDefined();
  });
  it("used for a waiter wage question", () => expect(needsRestaurantPack(null, "What must I pay a waiter?")).toBe(true));
  it("used for a takeaway shop", () => expect(needsRestaurantPack(null, "My takeaway staff want Sunday pay")).toBe(true));
  it("always used when the company is a restaurant", () => expect(needsRestaurantPack("restaurant", "How much leave do staff get?")).toBe(true));
  it("not used for a plumbing business", () => expect(needsRestaurantPack("other", "My plumber stole a pipe")).toBe(false));
  it("'cook' does not match 'cookie'", () => expect(needsRestaurantPack(null, "cookies policy on our website")).toBe(false));
});
