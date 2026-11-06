import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guards against the legacy homepage drifting back to promises the app can't keep.
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
const pricing = readFileSync(resolve(__dirname, "../pages/Pricing.tsx"), "utf8");

describe("legacy homepage honesty", () => {
  it("does not call the deleted super-endpoint", () => {
    expect(html).not.toMatch(/functions\/v1\/super-endpoint/);
  });
  it("has no hard-coded owner bypass emails", () => {
    expect(html).not.toMatch(/casperbadenhorst77@outlook\.com|badenhorst\.casper@gmail\.com/i);
  });
  it("makes no certainty claims", () => {
    for (const re of [/Always current/i, /Never miss a CCMA date/i, /LRA & BCEA Compliant/i, /Never include legal-advice disclaimers/i]) {
      expect(html).not.toMatch(re);
      expect(pricing).not.toMatch(re);
    }
  });
  it("only advertises the CCMA tracker because it exists, with a disclaimer", () => {
    // The tracker is real: page, route and migration must all be there.
    expect(existsSync(resolve(__dirname, "../pages/CcmaDeadlines.tsx"))).toBe(true);
    expect(readFileSync(resolve(__dirname, "../App.tsx"), "utf8")).toMatch(/path="\/account-app\/deadlines"/);
    expect(existsSync(resolve(__dirname, "../../supabase/migrations/20261106130000_ccma_deadline_tracker.sql"))).toBe(true);
    // Copy uses the honest wording only (no bare "CCMA tracker").
    for (const src of [html, pricing]) {
      expect(src).not.toMatch(/CCMA tracker/i);
      expect(src).toMatch(/CCMA deadline tracker with reminders/);
    }
    expect(html).toMatch(/not legal advice/i);
  });
  it("sells Enterprise at the advertised R3,999 everywhere", () => {
    const payfast = readFileSync(resolve(__dirname, "../../supabase/functions/_shared/payfast.ts"), "utf8");
    const trial = readFileSync(resolve(__dirname, "../../supabase/functions/start-trial/index.ts"), "utf8");
    const checkout = readFileSync(resolve(__dirname, "../../supabase/functions/payfast-checkout/index.ts"), "utf8");
    // Server price + allow-list
    expect(payfast).toMatch(/Enterprise:\s*3999/);
    expect(payfast).toMatch(/PLAN_NAMES[^\n]*"Enterprise"/);
    expect(trial).toMatch(/\["enterprise",\s*"Enterprise"\]/);
    expect(checkout).not.toMatch(/Enterprise is set up directly/);
    // Homepage modal + client amount match the server
    expect(html).toMatch(/selectPlan\('Enterprise'\)/);
    expect(html).toMatch(/Enterprise:\s*3999/);
    expect(html).not.toMatch(/plan === 'Enterprise'\) \{ window\.location\.assign\('\/contact/);
    // Pricing page card is a paid, trial-able plan at R3,999
    const ent = pricing.slice(pricing.indexOf('name: "Enterprise"'));
    expect(ent).toMatch(/amount:\s*3999/);
    expect(ent).toMatch(/kind:\s*"paid"/);
  });
  it("shares the working app address", () => {
    expect(html).not.toMatch(/inrecoapp\.inreco\.co\.za/);
  });
});
