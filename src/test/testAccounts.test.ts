import { describe, it, expect } from "vitest";
import { isTestOrInternalEmail } from "../../supabase/functions/_shared/testAccounts";

describe("owner/admin test-account exclusion", () => {
  it("excludes @inrecotest.co.za", () => expect(isTestOrInternalEmail("a@inrecotest.co.za")).toBe(true));
  it("excludes mailosaur on any subdomain, any case", () => {
    expect(isTestOrInternalEmail("foo@pnqsmtnz.mailosaur.net")).toBe(true);
    expect(isTestOrInternalEmail("Foo@Mailosaur.Net")).toBe(true);
  });
  it("excludes the two owner addresses", () => {
    expect(isTestOrInternalEmail("badenhorst.casper@gmail.com")).toBe(true);
    expect(isTestOrInternalEmail("CasperBadenhorst77@outlook.com")).toBe(true);
  });
  it("keeps real customers", () => {
    expect(isTestOrInternalEmail("odeab123@gmail.com")).toBe(false);
    expect(isTestOrInternalEmail("x@notmailosaur.net")).toBe(false);
  });
});
