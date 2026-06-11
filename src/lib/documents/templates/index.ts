// Launch-set HR document templates. Each builder takes plain form values and
// returns a DocumentTemplate that can be passed to generateDocument().
// Add a new template by exporting another builder and registering it in
// TEMPLATE_REGISTRY below.

import type { DocBlock, DocumentTemplate, SignatureBlock } from "../types";

export type TemplateFieldType = "text" | "textarea" | "date" | "select";

export type TemplateField = {
  key: string;
  label: string;
  type: TemplateFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
};

export type TemplateDefinition = {
  key: string;            // stable identifier, e.g. "warning"
  name: string;           // display name in picker
  description: string;    // short blurb
  fields: TemplateField[];
  build: (values: Record<string, string>) => DocumentTemplate;
};

// ---------- helpers ----------
function fmtDate(v: string | undefined): string {
  if (!v) return "____________";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function paragraphs(text: string | undefined): DocBlock[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map<DocBlock>((t) => ({ kind: "p", text: t }));
}

function sigs(employee: string | undefined): SignatureBlock[] {
  return [
    { label: "Authorised Signatory" },
    { label: "Employee", name: employee || undefined },
  ];
}

// ---------- 1. Written warning ----------
const warning: TemplateDefinition = {
  key: "warning",
  name: "Disciplinary warning",
  description: "Verbal, written or final written warning for a misconduct incident.",
  fields: [
    { key: "level", label: "Warning level", type: "select", required: true, options: [
      { value: "Verbal", label: "Verbal warning" },
      { value: "Written", label: "Written warning" },
      { value: "Final Written", label: "Final written warning" },
    ]},
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Employee position", type: "text" },
    { key: "incident_date", label: "Date of incident", type: "date", required: true },
    { key: "incident", label: "Description of misconduct", type: "textarea", required: true,
      placeholder: "Describe what happened, where, and any witnesses." },
    { key: "rule", label: "Rule or policy breached", type: "textarea",
      placeholder: "e.g. Clause 4.2 of the Disciplinary Code — absenteeism without notice." },
    { key: "consequence", label: "Consequence if repeated", type: "textarea",
      placeholder: "e.g. Further misconduct may result in dismissal." },
    { key: "validity", label: "Warning valid for", type: "text", placeholder: "e.g. 6 months" },
  ],
  build: (v) => ({
    type: "warning",
    title: `${v.level || "Written"} Warning`,
    subtitle: v.employee ? `Issued to: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `This serves as a ${(v.level || "written").toLowerCase()} warning issued on ${fmtDate(new Date().toISOString())} in respect of the following incident.` },
      { kind: "h", text: "Incident" },
      { kind: "p", text: `Date of incident: ${fmtDate(v.incident_date)}` },
      ...paragraphs(v.incident),
      ...(v.rule ? [{ kind: "h" as const, text: "Rule or policy breached" }, ...paragraphs(v.rule)] : []),
      { kind: "h", text: "Outcome" },
      { kind: "p", text: v.consequence || "A repeat of this or similar misconduct may lead to further disciplinary action, up to and including dismissal." },
      ...(v.validity ? [{ kind: "p" as const, text: `This warning will remain on the employee's record for ${v.validity}.` }] : []),
      { kind: "p", text: "The employee has the right to appeal this warning in writing within five (5) working days of receipt." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 2. Employment contract ----------
const contract: TemplateDefinition = {
  key: "contract",
  name: "Employment contract",
  description: "Standard fixed or permanent contract of employment.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "id_number", label: "ID / passport number", type: "text" },
    { key: "position", label: "Job title", type: "text", required: true },
    { key: "start_date", label: "Start date", type: "date", required: true },
    { key: "end_date", label: "End date (leave blank for permanent)", type: "date" },
    { key: "salary", label: "Salary", type: "text", required: true, placeholder: "e.g. R 25 000 per month, paid on the 25th." },
    { key: "hours", label: "Working hours", type: "text", placeholder: "e.g. Monday–Friday, 08:00 to 17:00" },
    { key: "probation", label: "Probation period", type: "text", placeholder: "e.g. 3 months" },
    { key: "duties", label: "Key duties", type: "textarea",
      placeholder: "List the main responsibilities. Use a blank line between paragraphs." },
    { key: "leave", label: "Annual leave", type: "text", placeholder: "e.g. 15 working days per annum" },
    { key: "notice", label: "Notice period", type: "text", placeholder: "e.g. One calendar month" },
  ],
  build: (v) => ({
    type: "contract",
    title: "Contract of Employment",
    subtitle: v.employee ? `Between the Employer and ${v.employee}` : undefined,
    body: [
      { kind: "h", text: "1. Parties" },
      { kind: "p", text: `This agreement is entered into between the Employer and ${v.employee || "the Employee"}${v.id_number ? ` (ID/Passport: ${v.id_number})` : ""}.` },
      { kind: "h", text: "2. Position and start date" },
      { kind: "p", text: `The Employee is appointed as ${v.position || "____________"}, commencing ${fmtDate(v.start_date)}${v.end_date ? ` and ending ${fmtDate(v.end_date)}` : " on a permanent basis"}.` },
      ...(v.probation ? [{ kind: "h" as const, text: "3. Probation" }, { kind: "p" as const, text: `The Employee will serve a probation period of ${v.probation}, during which performance and conduct will be assessed.` }] : []),
      { kind: "h", text: "4. Duties" },
      ...(v.duties ? paragraphs(v.duties) : [{ kind: "p" as const, text: "The Employee will perform the duties associated with the position and any other reasonable duties assigned by the Employer." }]),
      { kind: "h", text: "5. Remuneration" },
      { kind: "p", text: v.salary || "____________" },
      ...(v.hours ? [{ kind: "h" as const, text: "6. Hours of work" }, { kind: "p" as const, text: v.hours }] : []),
      ...(v.leave ? [{ kind: "h" as const, text: "7. Leave" }, { kind: "p" as const, text: v.leave }] : []),
      ...(v.notice ? [{ kind: "h" as const, text: "8. Termination" }, { kind: "p" as const, text: `Either party may terminate this contract on ${v.notice} written notice, subject to the Basic Conditions of Employment Act.` }] : []),
      { kind: "h", text: "9. Confidentiality" },
      { kind: "p", text: "The Employee will keep all confidential information of the Employer secret both during and after the period of employment." },
      { kind: "h", text: "10. Whole agreement" },
      { kind: "p", text: "This document, together with any policies referred to herein, forms the whole agreement between the parties." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 3. Dismissal letter ----------
const dismissal: TemplateDefinition = {
  key: "dismissal",
  name: "Dismissal letter",
  description: "Notice of termination following a fair process.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "hearing_date", label: "Date of disciplinary hearing", type: "date" },
    { key: "last_day", label: "Last day of employment", type: "date", required: true },
    { key: "reason", label: "Reason for dismissal", type: "textarea", required: true,
      placeholder: "Findings of the hearing and the misconduct that was proven." },
    { key: "appeal", label: "Appeal period", type: "text", placeholder: "e.g. 5 working days" },
  ],
  build: (v) => ({
    type: "dismissal",
    title: "Notice of Dismissal",
    subtitle: v.employee ? `Issued to: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      ...(v.hearing_date ? [{ kind: "p" as const, text: `Following the disciplinary hearing held on ${fmtDate(v.hearing_date)}, the Employer has decided to terminate your employment.` }] : [
        { kind: "p" as const, text: "The Employer has decided to terminate your employment after a fair disciplinary process." },
      ]),
      { kind: "h", text: "Reason" },
      ...paragraphs(v.reason),
      { kind: "h", text: "Effective date" },
      { kind: "p", text: `Your last day of employment will be ${fmtDate(v.last_day)}. All company property must be returned by that date.` },
      { kind: "h", text: "Right of appeal" },
      { kind: "p", text: `You may lodge a written appeal within ${v.appeal || "5 working days"} of receipt of this letter. You may also refer this matter to the CCMA within 30 days of dismissal in terms of the Labour Relations Act.` },
      { kind: "h", text: "Final pay" },
      { kind: "p", text: "Any outstanding remuneration, including accrued leave pay, will be paid in accordance with the Basic Conditions of Employment Act." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 4. Performance Improvement Plan (PIP) ----------
const pip: TemplateDefinition = {
  key: "pip",
  name: "Performance Improvement Plan",
  description: "Structured plan to address performance shortcomings.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "manager", label: "Line manager", type: "text" },
    { key: "start_date", label: "Plan start date", type: "date", required: true },
    { key: "review_date", label: "Review date", type: "date", required: true },
    { key: "concerns", label: "Areas of concern", type: "textarea", required: true,
      placeholder: "Specific shortfalls — measurable wherever possible." },
    { key: "objectives", label: "Improvement objectives", type: "textarea", required: true,
      placeholder: "What does success look like by the review date? Use a blank line between objectives." },
    { key: "support", label: "Support to be provided", type: "textarea",
      placeholder: "Training, mentoring, tools, etc." },
  ],
  build: (v) => ({
    type: "pip",
    title: "Performance Improvement Plan",
    subtitle: v.employee ? `For: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `Plan period: ${fmtDate(v.start_date)} to ${fmtDate(v.review_date)}.` },
      ...(v.manager ? [{ kind: "p" as const, text: `Line manager: ${v.manager}` }] : []),
      { kind: "h", text: "Areas of concern" },
      ...paragraphs(v.concerns),
      { kind: "h", text: "Improvement objectives" },
      ...paragraphs(v.objectives),
      ...(v.support ? [{ kind: "h" as const, text: "Support to be provided" }, ...paragraphs(v.support)] : []),
      { kind: "h", text: "Review" },
      { kind: "p", text: `Progress will be formally reviewed on ${fmtDate(v.review_date)}. Failure to meet the objectives without good reason may result in further action, including incapacity proceedings.` },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 5. Leave decision letter ----------
const leave: TemplateDefinition = {
  key: "leave",
  name: "Leave decision letter",
  description: "Approve or refuse a leave application.",
  fields: [
    { key: "decision", label: "Decision", type: "select", required: true, options: [
      { value: "Approved", label: "Approved" },
      { value: "Refused", label: "Refused" },
    ]},
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "leave_type", label: "Leave type", type: "select", required: true, options: [
      { value: "Annual leave", label: "Annual leave" },
      { value: "Sick leave", label: "Sick leave" },
      { value: "Family responsibility leave", label: "Family responsibility leave" },
      { value: "Unpaid leave", label: "Unpaid leave" },
      { value: "Special leave", label: "Special leave" },
    ]},
    { key: "from_date", label: "From", type: "date", required: true },
    { key: "to_date", label: "To", type: "date", required: true },
    { key: "reason", label: "Reason / motivation (optional)", type: "textarea" },
  ],
  build: (v) => ({
    type: "leave",
    title: `Leave application — ${v.decision || "Decision"}`,
    subtitle: v.employee ? `For: ${v.employee}` : undefined,
    body: [
      { kind: "p", text: `Your application for ${v.leave_type || "leave"} from ${fmtDate(v.from_date)} to ${fmtDate(v.to_date)} has been ${(v.decision || "considered").toLowerCase()}.` },
      ...(v.reason ? [{ kind: "h" as const, text: "Motivation on file" }, ...paragraphs(v.reason)] : []),
      ...(v.decision === "Refused" ? [{ kind: "p" as const, text: "Should you wish to discuss this decision or submit additional information, please contact your line manager within five (5) working days." }] : [{ kind: "p" as const, text: "Please ensure that handover arrangements are in place before the leave period commences." }]),
    ],
    signatures: [{ label: "Authorised Signatory" }],
  }),
};

// ---------- 6. NDA ----------
const nda: TemplateDefinition = {
  key: "nda",
  name: "Confidentiality agreement (NDA)",
  description: "Mutual non-disclosure for employees, contractors or third parties.",
  fields: [
    { key: "counterparty", label: "Counterparty name", type: "text", required: true,
      help: "The other party — employee, contractor or company." },
    { key: "purpose", label: "Purpose", type: "textarea", required: true,
      placeholder: "Describe why confidential information is being shared." },
    { key: "term", label: "Term", type: "text", placeholder: "e.g. 3 years from the date of signature" },
    { key: "law", label: "Governing law", type: "text", placeholder: "e.g. The laws of the Republic of South Africa" },
  ],
  build: (v) => ({
    type: "nda",
    title: "Confidentiality Agreement",
    subtitle: v.counterparty ? `Between the Disclosing Party and ${v.counterparty}` : undefined,
    body: [
      { kind: "h", text: "1. Purpose" },
      ...paragraphs(v.purpose),
      { kind: "h", text: "2. Confidential information" },
      { kind: "p", text: "Confidential information means any information disclosed by one party to the other, whether oral, written or in any other form, that is marked or would reasonably be considered confidential." },
      { kind: "h", text: "3. Obligations" },
      { kind: "list", items: [
        "Keep all confidential information strictly secret.",
        "Use it only for the purpose set out above.",
        "Do not disclose it to any third party without prior written consent.",
        "Take reasonable steps to protect it from unauthorised access.",
      ]},
      { kind: "h", text: "4. Exclusions" },
      { kind: "p", text: "Information that is public, was already known, is independently developed, or is required to be disclosed by law is not confidential information." },
      { kind: "h", text: "5. Term" },
      { kind: "p", text: v.term || "This agreement will remain in force for a period of three (3) years from the date of last signature." },
      { kind: "h", text: "6. Governing law" },
      { kind: "p", text: v.law || "This agreement is governed by the laws of the Republic of South Africa." },
    ],
    signatures: [
      { label: "Disclosing Party" },
      { label: "Receiving Party", name: v.counterparty || undefined },
    ],
  }),
};

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  warning,
  contract,
  dismissal,
  pip,
  leave,
  nda,
];

export function getTemplate(key: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.key === key);
}
