import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstallCta from "@/components/InstallCta";

vi.mock("@/lib/pwaInstall", () => ({
  isStandalone: () => false,
  subscribeInstall: () => () => undefined,
}));

describe("installation invitation dismissal", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("keeps a dismissed banner hidden after navigating or reopening", () => {
    const first = render(<InstallCta variant="banner" />);
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(localStorage.getItem("inreco.installBannerDismissed")).toBe("1");
    first.unmount();
    const reopened = render(<InstallCta variant="banner" />);
    expect(reopened.container.childElementCount).toBe(0);
  });

  it("leaves explicit installation available after dismissing the banner", () => {
    localStorage.setItem("inreco.installBannerDismissed", "1");
    render(<InstallCta variant="button" />);
    expect(screen.getByRole("button", { name: "Install the app" })).toBeEnabled();
  });
});