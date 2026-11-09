import { describe, it, expect } from "vitest";
import { needsRestaurantPack } from "@/lib/industryMatch";

describe("restaurant agreement knowledge", () => {
  it("used for a waiter wage question", () => expect(needsRestaurantPack(null, "What must I pay a waiter?")).toBe(true));
  it("used for a takeaway shop", () => expect(needsRestaurantPack(null, "My takeaway staff want Sunday pay")).toBe(true));
  it("always used when the company is a restaurant", () => expect(needsRestaurantPack("restaurant", "How much leave do staff get?")).toBe(true));
  it("not used for a plumbing business", () => expect(needsRestaurantPack("other", "My plumber stole a pipe")).toBe(false));
  it("'cook' does not match 'cookie'", () => expect(needsRestaurantPack(null, "cookies policy on our website")).toBe(false));
});
