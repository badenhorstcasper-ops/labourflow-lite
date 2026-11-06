import { describe, it, expect } from "vitest";
import { describeAiError, withDisclaimer } from "@/lib/cara/aiErrors";

describe("describeAiError", () => {
  it("maps server codes to friendly kinds", () => {
    expect(describeAiError(401, { error: "not_signed_in" }).kind).toBe("signed_out");
    expect(describeAiError(402, { error: "not_entitled" }).kind).toBe("locked");
    expect(describeAiError(429, { error: "monthly_limit" }).kind).toBe("limit");
    expect(describeAiError(429, { error: "ai_busy" }).kind).toBe("busy");
    expect(describeAiError(503, { error: "ai_unavailable" }).kind).toBe("unavailable");
    expect(describeAiError(500, null).kind).toBe("unavailable");
    expect(describeAiError(null, null).kind).toBe("unknown");
  });
  it("prefers the server's friendly message and never shows raw codes", () => {
    expect(describeAiError(503, { error: "ai_unavailable", message: "Paused." }).message).toBe("Paused.");
    expect(describeAiError(503, { error: "ai_unavailable" }).message).toMatch(/temporarily unavailable/);
  });
});

describe("withDisclaimer", () => {
  it("adds the disclaimer once", () => {
    const once = withDisclaimer("Do X.");
    expect(once).toMatch(/not legal advice/);
    expect(withDisclaimer(once)).toBe(once);
  });
});
