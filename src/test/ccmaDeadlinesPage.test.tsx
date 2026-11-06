import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { addDays, todaySAST } from "@/lib/ccma/deadlines";

const today = todaySAST();
const base = {
  owner_user_id: "a", created_by_user_id: "a", employee_name: null, case_number: "GAJB1234-26",
  custom_due_date: null, completed_at: null, reminder_days: [7, 3, 1], email_reminders: true,
  reminder_sent_at: null, notes: null, created_at: "", updated_at: "",
};
const matters = [
  { ...base, id: "1", title: "Later matter", dispute_type: "unfair_labour_practice", trigger_date: addDays(today, -60), due_date: addDays(today, 30), status: "open" },
  { ...base, id: "2", title: "Urgent dismissal", dispute_type: "unfair_dismissal", trigger_date: addDays(today, -28), due_date: addDays(today, 2), status: "open" },
  { ...base, id: "3", title: "Old one", dispute_type: "rescission", trigger_date: addDays(today, -40), due_date: addDays(today, -26), status: "done" },
];
const h = vi.hoisted(() => ({ matters: [] as any[], setMatterStatus: null as any }));
h.matters = matters;
const setMatterStatus = vi.fn(async (id: string, status: string) => ({ ...matters.find((m) => m.id === id)!, status }));
h.setMatterStatus = setMatterStatus;

vi.mock("@/components/AppShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/ccma/matters", async (orig) => {
  const real = await orig<typeof import("@/lib/ccma/matters")>();
  return {
    ...real,
    listMatters: vi.fn(async () => h.matters),
    listUnreadReminders: vi.fn(async () => [{ id: "r1", matter_id: "2", due_date: h.matters[1].due_date, stage: 3, days_left: 2, read_at: null, created_at: "" }]),
    markRemindersRead: vi.fn(async () => undefined),
    setMatterStatus: (...a: any[]) => h.setMatterStatus(...a),
    createMatter: vi.fn(),
    updateMatter: vi.fn(),
    deleteMatter: vi.fn(),
  };
});

import CcmaDeadlinesPage from "@/pages/CcmaDeadlines";

describe("CCMA deadlines page", () => {
  beforeEach(() => setMatterStatus.mockClear());

  it("lists open deadlines soonest first with a countdown, reminder banner and disclaimer", async () => {
    render(<MemoryRouter><CcmaDeadlinesPage /></MemoryRouter>);
    await screen.findAllByText("Urgent dismissal");
    const titles = screen.getAllByText(/Urgent dismissal|Later matter/).map((e) => e.textContent);
    expect(titles[0]).toMatch(/Urgent dismissal/); // banner or card first
    expect(screen.getByText("2 days left")).toBeInTheDocument();
    expect(screen.getByText("30 days left")).toBeInTheDocument();
    expect(screen.getByText(/1 reminder/)).toBeInTheDocument();
    expect(screen.getByText(/Guidance, not legal advice/)).toBeInTheDocument();
    expect(screen.queryByText("Old one")).not.toBeInTheDocument(); // closed are collapsed
  });

  it("marks a deadline done", async () => {
    render(<MemoryRouter><CcmaDeadlinesPage /></MemoryRouter>);
    await screen.findAllByText("Urgent dismissal");
    fireEvent.click(screen.getAllByRole("button", { name: /Mark done/ })[0]);
    await waitFor(() => expect(setMatterStatus).toHaveBeenCalledWith("2", "done"));
  });

  it("shows the computed due date while adding a dismissal", async () => {
    render(<MemoryRouter><CcmaDeadlinesPage /></MemoryRouter>);
    await screen.findAllByText("Urgent dismissal");
    fireEvent.click(screen.getByRole("button", { name: /Add deadline/ }));
    const date = await screen.findByLabelText("Date of dismissal");
    fireEvent.change(date, { target: { value: "2026-11-01" } });
    expect(await screen.findByText(/Due Tue 1 Dec 2026/)).toBeInTheDocument();
  });
});
