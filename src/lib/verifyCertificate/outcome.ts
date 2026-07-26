// Pure classifier for the medical-certificate verification results.
// The three possible statuses per register match the dropdown in the UI.

export type RegisterStatus =
  | "verified_active"
  | "suspended_inactive"
  | "number_mismatch"
  | "no_match"
  | "could_not_check"
  | "";

export type Outcome = "verified" | "inconclusive" | "discrepancy";

export const STATUS_OPTIONS: { value: Exclude<RegisterStatus, "">; label: string }[] = [
  { value: "verified_active", label: "Verified / Active" },
  { value: "suspended_inactive", label: "Verified but Suspended / Inactive" },
  { value: "number_mismatch", label: "Name found but number does not match" },
  { value: "no_match", label: "No match found" },
  { value: "could_not_check", label: "Could not complete check" },
];

const HARD_MISMATCH: RegisterStatus[] = ["no_match", "number_mismatch", "suspended_inactive"];

export function classifyOutcome(
  hpcsa: RegisterStatus,
  pcns: RegisterStatus,
): Outcome {
  const both = [hpcsa, pcns];
  if (both.some((s) => HARD_MISMATCH.includes(s))) return "discrepancy";
  const filled = both.filter((s) => s && s !== "could_not_check");
  if (filled.length > 0 && filled.every((s) => s === "verified_active")) {
    // At least one register verified active, and no unresolved "could_not_check" issues
    if (both.every((s) => s === "verified_active" || s === "")) return "verified";
  }
  return "inconclusive";
}

export function statusLabel(v: RegisterStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === v)?.label || "—";
}
