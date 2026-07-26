// Builds the suggested charge sheet + procedural fairness checklist.
// This is a decision-support draft only — the wording must be finalised by
// a qualified labour law practitioner.

export type ChargeInputs = {
  employeeName: string;
  practitionerName: string;
  practiceName?: string;
  incapacityFrom?: string;
  incapacityTo?: string;
  certIssuedOn?: string;
};

function fmtDate(iso?: string): string {
  if (!iso) return "[date]";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function buildPrimaryCharge(v: ChargeInputs): string {
  const practice = v.practitionerName + (v.practiceName ? ` of ${v.practiceName}` : "");
  return (
    `Gross dishonesty / misconduct, in that on or about ${fmtDate(v.certIssuedOn)}, the employee ` +
    `submitted, or caused to be submitted, a medical certificate purporting to be issued by ` +
    `${practice}, which certificate could not be verified as genuine and/or was found to contain ` +
    `false or fraudulent information, in an attempt to justify and/or conceal unauthorised absence ` +
    `from work, thereby breaching the trust relationship between employer and employee.`
  );
}

export function buildAlternativeCharge(v: ChargeInputs): string {
  return (
    `Unauthorised absence from work from ${fmtDate(v.incapacityFrom)} to ${fmtDate(v.incapacityTo)}, ` +
    `alternatively failure to provide a valid and verifiable reason for absence during this period.`
  );
}

export const CHARGE_DISCLAIMER =
  "These are suggested charge formulations only. The final wording, and whether to charge in the " +
  "alternative, must be finalised with a qualified labour law practitioner and tailored to the " +
  "specific facts, in line with Schedule 8 of the LRA (Code of Good Practice: Dismissal) and the " +
  "employer's own disciplinary code.";

export const PROCEDURAL_CHECKLIST: string[] = [
  "Notice of hearing given in writing, in a language/format the employee understands, with reasonable notice (typically at least 48 hours).",
  "Notice specifies the charge(s), date, time, venue, and right to representation (by a co-employee or, where the disciplinary code allows, a union representative).",
  "Employee's right to state their case, call witnesses, and question evidence.",
  "Independent / impartial chairperson (not the employee's direct accuser or someone who conducted the investigation).",
  "Interpreter arranged if needed.",
  "Certificate, verification records, and any correspondence with the practice / HPCSA / AHPCSA attached as evidence bundle.",
  "Outcome and reasons communicated in writing, with right of appeal noted if the disciplinary code provides for one.",
];
