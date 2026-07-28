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

// ---------- 7. Notice of disciplinary hearing ----------
const notice_hearing: TemplateDefinition = {
  key: "notice_hearing",
  name: "Notice of disciplinary hearing",
  description: "Formally notify an employee of a disciplinary hearing and the charges.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "hearing_date", label: "Hearing date", type: "date", required: true },
    { key: "hearing_time", label: "Hearing time", type: "text", placeholder: "e.g. 10:00", required: true },
    { key: "venue", label: "Venue", type: "text", required: true },
    { key: "chair", label: "Chairperson", type: "text" },
    { key: "charges", label: "Charge(s)", type: "textarea", required: true,
      placeholder: "List each charge with date, place and the rule allegedly broken. Use a blank line between charges." },
  ],
  build: (v) => ({
    type: "notice_hearing",
    title: "Notice of Disciplinary Hearing",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `You are required to attend a disciplinary hearing on ${fmtDate(v.hearing_date)} at ${v.hearing_time || "____________"}, to be held at ${v.venue || "____________"}.` },
      ...(v.chair ? [{ kind: "p" as const, text: `The hearing will be chaired by ${v.chair}.` }] : []),
      { kind: "h", text: "Charges" },
      ...paragraphs(v.charges),
      { kind: "h", text: "Your rights" },
      { kind: "list", items: [
        "You may be represented by a fellow employee or a recognised shop steward.",
        "You may call witnesses and present documentary evidence.",
        "You may cross-examine the employer's witnesses.",
        "You may use a translator if required.",
        "You are entitled to a written outcome with reasons.",
      ]},
      { kind: "p", text: "Failure to attend without good reason may result in the hearing proceeding in your absence." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 8. Precautionary suspension letter ----------
const suspension: TemplateDefinition = {
  key: "suspension",
  name: "Precautionary suspension letter",
  description: "Suspend an employee on full pay pending investigation.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "start_date", label: "Suspension start date", type: "date", required: true },
    { key: "expected_duration", label: "Expected duration", type: "text", placeholder: "e.g. up to 10 working days" },
    { key: "allegations", label: "Allegations being investigated", type: "textarea", required: true },
    { key: "contact", label: "Contact person during suspension", type: "text", placeholder: "Name + phone / email" },
  ],
  build: (v) => ({
    type: "suspension",
    title: "Notice of Precautionary Suspension",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `You are hereby placed on precautionary suspension with effect from ${fmtDate(v.start_date)}, pending the outcome of an investigation into the allegations set out below.` },
      { kind: "h", text: "Allegations under investigation" },
      ...paragraphs(v.allegations),
      { kind: "h", text: "Terms of suspension" },
      { kind: "list", items: [
        "This suspension is precautionary and is not a sanction or finding of guilt.",
        "You will remain on full pay and benefits for the duration of the suspension.",
        `Expected duration: ${v.expected_duration || "as short as reasonably possible"}. You will be kept informed of any extension.`,
        "You may not enter the workplace or contact witnesses without prior written approval.",
        v.contact ? `For any work-related matters during your suspension, please contact ${v.contact}.` : "A contact person will be communicated to you separately.",
      ]},
      { kind: "p", text: "You will be invited to a disciplinary hearing in writing should the investigation lead to formal charges." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 9. AWOL / return-to-work letter ----------
const return_to_work: TemplateDefinition = {
  key: "return_to_work",
  name: "AWOL / return-to-work letter",
  description: "Instruct an absent employee to return or explain, before disciplinary action.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "absent_from", label: "Absent from (date)", type: "date", required: true },
    { key: "deadline", label: "Return / response deadline", type: "date", required: true },
    { key: "contact_attempts", label: "Contact attempts made", type: "textarea",
      placeholder: "List the dates and methods you tried (phone, WhatsApp, email)." },
  ],
  build: (v) => ({
    type: "return_to_work",
    title: "Notice to Return to Work",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `Our records show that you have been absent from work without authorisation since ${fmtDate(v.absent_from)}. As at the date of this letter, we have not received any explanation for your absence.` },
      ...(v.contact_attempts ? [{ kind: "h" as const, text: "Contact attempts" }, ...paragraphs(v.contact_attempts)] : []),
      { kind: "h", text: "Required action" },
      { kind: "p", text: `You are instructed to return to work, or to provide a written explanation (with supporting documentation if applicable), by no later than ${fmtDate(v.deadline)}.` },
      { kind: "h", text: "Consequences" },
      { kind: "p", text: "Failure to respond by the deadline will be treated as desertion. The Employer will then proceed to convene a disciplinary hearing in your absence, which may result in your dismissal." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 10. Grievance acknowledgement & outcome ----------
const grievance_ack: TemplateDefinition = {
  key: "grievance_ack",
  name: "Grievance acknowledgement & outcome",
  description: "Acknowledge a formal grievance and record the outcome.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "received_date", label: "Date grievance received", type: "date", required: true },
    { key: "summary", label: "Summary of grievance", type: "textarea", required: true },
    { key: "investigation", label: "Investigation steps taken", type: "textarea" },
    { key: "outcome", label: "Outcome / decision", type: "textarea", required: true },
    { key: "next_step", label: "Next step / escalation rights", type: "textarea",
      placeholder: "e.g. The employee may escalate to senior management within 5 working days." },
  ],
  build: (v) => ({
    type: "grievance_ack",
    title: "Grievance Outcome",
    subtitle: v.employee ? `For: ${v.employee}` : undefined,
    body: [
      { kind: "p", text: `We confirm receipt of your formal grievance on ${fmtDate(v.received_date)}. Following our internal grievance procedure, we have considered the matter and provide our response below.` },
      { kind: "h", text: "Summary of grievance" },
      ...paragraphs(v.summary),
      ...(v.investigation ? [{ kind: "h" as const, text: "Investigation" }, ...paragraphs(v.investigation)] : []),
      { kind: "h", text: "Outcome" },
      ...paragraphs(v.outcome),
      { kind: "h", text: "Next steps" },
      { kind: "p", text: v.next_step || "Should you remain dissatisfied, you may escalate this grievance to the next level of management within five (5) working days of receipt of this letter." },
    ],
    signatures: [{ label: "Authorised Signatory" }],
  }),
};

// ---------- 11. s189(3) consultation notice ----------
const retrenchment_s189: TemplateDefinition = {
  key: "retrenchment_s189",
  name: "s189(3) consultation notice",
  description: "Open retrenchment consultations in line with section 189 of the LRA.",
  fields: [
    { key: "issued_to", label: "Issued to", type: "text", required: true,
      placeholder: "e.g. All affected employees / Recognised trade union" },
    { key: "reasons", label: "Reasons for contemplated retrenchments", type: "textarea", required: true },
    { key: "alternatives", label: "Alternatives considered", type: "textarea", required: true,
      placeholder: "e.g. short time, redeployment, voluntary separation packages, freezing posts." },
    { key: "number_affected", label: "Number of employees potentially affected", type: "text", required: true },
    { key: "categories", label: "Categories of employees affected", type: "textarea" },
    { key: "selection", label: "Proposed selection criteria", type: "textarea", required: true,
      placeholder: "e.g. LIFO, skills required going forward, performance, disciplinary record." },
    { key: "timing", label: "Proposed timing", type: "text", required: true,
      placeholder: "e.g. Consultations to commence on … and conclude no earlier than …" },
    { key: "severance", label: "Severance proposed", type: "text", required: true,
      placeholder: "e.g. 1 week per completed year of service, plus notice pay and accrued leave." },
    { key: "consult_with", label: "Whom we propose to consult with", type: "text",
      placeholder: "e.g. the affected employees themselves / shop stewards of …" },
  ],
  build: (v) => ({
    type: "retrenchment_s189",
    title: "Notice in terms of Section 189(3) of the Labour Relations Act",
    subtitle: v.issued_to ? `Issued to: ${v.issued_to}` : undefined,
    body: [
      { kind: "p", text: "The Employer contemplates dismissals based on its operational requirements and hereby invites consultations in terms of section 189(3) of the Labour Relations Act, 1995. The information required by section 189(3) is set out below." },
      { kind: "h", text: "1. Reasons for the proposed dismissals" },
      ...paragraphs(v.reasons),
      { kind: "h", text: "2. Alternatives considered" },
      ...paragraphs(v.alternatives),
      { kind: "h", text: "3. Number and categories of employees affected" },
      { kind: "p", text: `Number of employees potentially affected: ${v.number_affected}.` },
      ...(v.categories ? paragraphs(v.categories) : []),
      { kind: "h", text: "4. Proposed selection criteria" },
      ...paragraphs(v.selection),
      { kind: "h", text: "5. Timing" },
      { kind: "p", text: v.timing },
      { kind: "h", text: "6. Severance pay proposed" },
      { kind: "p", text: v.severance },
      ...(v.consult_with ? [{ kind: "h" as const, text: "7. Consulting parties" }, { kind: "p" as const, text: v.consult_with }] : []),
      { kind: "h", text: "Invitation to consult" },
      { kind: "p", text: "The Employer invites the consulting party to engage meaningfully on all of the above, including any further information reasonably required to consult effectively. Written representations may be submitted, and the Employer undertakes to respond in writing and to give reasons for disagreement." },
    ],
    signatures: [{ label: "Authorised Signatory" }],
  }),
};

// ---------- 12. Retrenchment notice (post-consultation) ----------
const retrenchment_letter: TemplateDefinition = {
  key: "retrenchment_letter",
  name: "Retrenchment notice (post-consultation)",
  description: "Final retrenchment letter issued after meaningful consultation.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "consultation_summary", label: "Summary of consultations", type: "textarea", required: true,
      placeholder: "Dates of meetings, parties consulted, alternatives explored." },
    { key: "last_day", label: "Last day of employment", type: "date", required: true },
    { key: "severance", label: "Severance amount", type: "text", required: true,
      placeholder: "e.g. R XX XXX, being 1 week per completed year of service." },
    { key: "notice_pay", label: "Notice pay", type: "text", placeholder: "e.g. One calendar month" },
    { key: "leave_pay", label: "Accrued leave pay", type: "text", placeholder: "e.g. X days payable" },
    { key: "reference", label: "Reference / assistance offered", type: "textarea",
      placeholder: "e.g. Letter of reference, UIF documents, outplacement support." },
  ],
  build: (v) => ({
    type: "retrenchment_letter",
    title: "Notice of Retrenchment",
    subtitle: v.employee ? `Issued to: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: "Following meaningful consultations in terms of section 189 of the Labour Relations Act, the Employer regrets to inform you that your position has been identified for retrenchment based on the operational requirements of the business." },
      { kind: "h", text: "Consultation process" },
      ...paragraphs(v.consultation_summary),
      { kind: "h", text: "Effective date" },
      { kind: "p", text: `Your last day of employment will be ${fmtDate(v.last_day)}.` },
      { kind: "h", text: "Severance and final pay" },
      { kind: "list", items: [
        `Severance: ${v.severance}`,
        ...(v.notice_pay ? [`Notice pay: ${v.notice_pay}`] : []),
        ...(v.leave_pay ? [`Accrued leave pay: ${v.leave_pay}`] : []),
        "These amounts will be paid into your nominated bank account on the next payroll run.",
      ]},
      ...(v.reference ? [{ kind: "h" as const, text: "Assistance" }, ...paragraphs(v.reference)] : []),
      { kind: "h", text: "Your rights" },
      { kind: "p", text: "You may refer a dispute about the fairness of this retrenchment to the CCMA within 30 days, or to the Labour Court where section 189A applies." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 13. Notice of incapacity enquiry ----------
const incapacity_notice: TemplateDefinition = {
  key: "incapacity_notice",
  name: "Notice of incapacity enquiry",
  description: "Convene an incapacity enquiry for ill-health or poor performance.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "type", label: "Type of incapacity", type: "select", required: true, options: [
      { value: "Ill-health / injury", label: "Ill-health / injury" },
      { value: "Poor performance", label: "Poor performance" },
    ]},
    { key: "enquiry_date", label: "Enquiry date", type: "date", required: true },
    { key: "enquiry_time", label: "Enquiry time", type: "text", required: true, placeholder: "e.g. 10:00" },
    { key: "venue", label: "Venue", type: "text", required: true },
    { key: "background", label: "Background", type: "textarea", required: true,
      placeholder: "Summarise the medical / performance facts and what has already been tried." },
  ],
  build: (v) => ({
    type: "incapacity_notice",
    title: "Notice of Incapacity Enquiry",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `You are invited to attend an incapacity enquiry in respect of ${v.type ? v.type.toLowerCase() : "your incapacity"}, to be held on ${fmtDate(v.enquiry_date)} at ${v.enquiry_time} at ${v.venue}.` },
      { kind: "h", text: "Background" },
      ...paragraphs(v.background),
      { kind: "h", text: "Purpose of the enquiry" },
      { kind: "list", items: [
        "To consider the nature and extent of the incapacity.",
        "To consider whether you are capable of performing your duties.",
        "To consider reasonable alternatives, such as adapted duties, reduced hours, redeployment, or further training.",
        "To consider whether termination of employment is appropriate as a last resort.",
      ]},
      { kind: "h", text: "Your rights" },
      { kind: "list", items: [
        "You may be represented by a fellow employee or shop steward.",
        "You may present medical reports, evidence and witnesses.",
        "You may make representations on alternatives to dismissal.",
      ]},
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 14. Counselling / coaching record ----------
const counselling: TemplateDefinition = {
  key: "counselling",
  name: "Counselling record",
  description: "Informal counselling discussion — the step before a formal warning.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "date", label: "Date of discussion", type: "date", required: true },
    { key: "issue", label: "Issue discussed", type: "textarea", required: true },
    { key: "agreed_actions", label: "Agreed actions", type: "textarea", required: true,
      placeholder: "What the employee will do, what the employer will do, and by when." },
    { key: "review_date", label: "Review date", type: "date" },
  ],
  build: (v) => ({
    type: "counselling",
    title: "Counselling Record",
    subtitle: v.employee ? `Employee: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `Date of discussion: ${fmtDate(v.date)}` },
      { kind: "h", text: "Issue discussed" },
      ...paragraphs(v.issue),
      { kind: "h", text: "Agreed actions" },
      ...paragraphs(v.agreed_actions),
      ...(v.review_date ? [{ kind: "h" as const, text: "Review" }, { kind: "p" as const, text: `Progress will be reviewed on ${fmtDate(v.review_date)}.` }] : []),
      { kind: "p", text: "This is an informal counselling discussion and does not constitute a disciplinary warning. The record is kept on file for reference." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 15. AARTO / Driver Policy ----------
const aarto_policy: TemplateDefinition = {
  key: "aarto_policy",
  name: "AARTO / Driver Policy",
  description: "Full driver, fleet and AARTO compliance policy — licence verification, disclosure duty, demerit monitoring, fleet rules and disciplinary offences.",
  fields: [
    { key: "effective_date", label: "Effective date", type: "date", required: true },
    { key: "scope", label: "Employees covered", type: "textarea",
      placeholder: "e.g. All employees who drive any company vehicle, or who use their own vehicle for company business, or who are required to hold a valid driver's licence as part of their duties." },
    { key: "verification_freq", label: "Licence verification frequency", type: "text",
      placeholder: "e.g. On appointment and annually thereafter, and immediately after any incident." },
    { key: "disclosure_deadline", label: "Disclosure deadline", type: "text",
      placeholder: "e.g. Within 24 hours of becoming aware of any suspension, cancellation or endorsement." },
    { key: "alcohol_testing", label: "Alcohol / drug testing", type: "textarea",
      placeholder: "State when testing may be conducted (e.g. random, post-incident, reasonable suspicion) and the process followed." },
    { key: "fines_treatment", label: "Treatment of traffic fines", type: "textarea",
      placeholder: "e.g. Fines resulting from the driver's conduct are the driver's personal liability and may be recovered from salary with written consent." },
  ],
  build: (v) => ({
    type: "aarto_policy",
    title: "AARTO, Driver and Fleet Policy",
    subtitle: `Effective from ${fmtDate(v.effective_date)}`,
    body: [
      { kind: "h", text: "1. Purpose" },
      { kind: "p", text: "This policy sets out the Employer's requirements for employees who drive as part of their duties, and gives effect to the Employer's obligations under the National Road Traffic Act, the Administrative Adjudication of Road Traffic Offences Act 46 of 1998 (AARTO), the Occupational Health and Safety Act, and the Employer's insurance arrangements." },
      { kind: "h", text: "2. Scope" },
      ...paragraphs(v.scope || "This policy applies to every employee who drives a company vehicle, uses a personal vehicle for company business, or is required to hold a valid driver's licence as an inherent requirement of the position."),
      { kind: "h", text: "3. Inherent requirement" },
      { kind: "p", text: "Where the position requires driving, a valid, current and unrestricted driver's licence for the applicable vehicle class is an INHERENT REQUIREMENT of the position. Loss, suspension or cancellation of the licence may materially affect the employee's continued employment." },
      { kind: "h", text: "4. Licence verification" },
      { kind: "p", text: v.verification_freq || "The Employer will verify each driving employee's licence on appointment and at least annually thereafter, and may verify at any time after an incident, accident or complaint. The employee consents to such verification, including checks with the RTIA / eNaTIS." },
      { kind: "h", text: "5. Disclosure duty" },
      { kind: "list", items: [
        `The employee must disclose IN WRITING any suspension, cancellation, endorsement or material restriction of their licence ${v.disclosure_deadline || "within 24 hours of becoming aware"}.`,
        "The employee must disclose any infringement notice, summons, arrest or conviction relating to the driving of any vehicle.",
        "Where operationally relevant, the employee must disclose their accumulated demerit balance on request.",
        "Non-disclosure or false disclosure constitutes serious misconduct.",
      ]},
      { kind: "h", text: "6. AARTO compliance" },
      { kind: "list", items: [
        "Every infringement notice served on the employee (whether at work or otherwise) must be reported to the line manager within 48 hours.",
        "The employee is responsible for paying, representing or electing to be tried on their own infringements, and for managing their demerit balance.",
        "The Employer will not represent the employee in AARTO proceedings and does not accept responsibility for the employee's demerit accumulation.",
        "The employee may not drive on Employer business once their licence is suspended, cancelled or otherwise invalid.",
      ]},
      { kind: "h", text: "7. Fleet rules" },
      { kind: "list", items: [
        "Only authorised employees, listed in writing, may drive Employer vehicles.",
        "Pre-trip inspections must be conducted and defects reported before use.",
        "Company vehicles may not be used for private purposes without written authorisation.",
        "Telematics / tracking is installed for safety, insurance and operational reasons; the employee consents to its use.",
        "All accidents and incidents must be reported immediately, regardless of severity.",
      ]},
      ...(v.alcohol_testing ? [{ kind: "h" as const, text: "8. Alcohol and drug testing" }, ...paragraphs(v.alcohol_testing)] : []),
      ...(v.fines_treatment ? [{ kind: "h" as const, text: "9. Traffic fines" }, ...paragraphs(v.fines_treatment)] : []),
      { kind: "h", text: "10. Disciplinary offences" },
      { kind: "list", items: [
        "Driving without a valid licence.",
        "Failure to disclose licence suspension, cancellation or endorsement.",
        "Concealing or misrepresenting demerit points, infringements or convictions.",
        "Unauthorised use of a company vehicle.",
        "Repeated traffic violations while on Employer business.",
        "Gross negligence or reckless driving.",
        "Refusing lawful alcohol or drug testing where this policy applies.",
      ]},
      { kind: "h", text: "11. POPIA" },
      { kind: "p", text: "Personal information collected under this policy (licence details, RTIA records, demerit balance, testing results) is processed only for the purposes set out in this policy, kept secure, and disclosed only to those who need it. The employee has the rights afforded by the Protection of Personal Information Act." },
      { kind: "h", text: "12. Acknowledgement" },
      { kind: "p", text: "By signing below, the employee acknowledges receipt of this policy, agrees to its terms, and consents to the licence verification and processing of personal information described above." },
    ],
    signatures: [
      { label: "Authorised Signatory" },
      { label: "Employee" },
    ],
  }),
};

// ---------- 16. Driver contract addendum ----------
const driver_addendum: TemplateDefinition = {
  key: "driver_addendum",
  name: "Driver contract addendum",
  description: "Addendum making a valid driver's licence an inherent requirement, with disclosure duty and consent to periodic verification.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text", required: true },
    { key: "licence_class", label: "Required licence class", type: "text", placeholder: "e.g. Code B, Code EC1, PrDP" },
    { key: "effective_date", label: "Effective date", type: "date", required: true },
  ],
  build: (v) => ({
    type: "driver_addendum",
    title: "Addendum to Contract of Employment — Driving Requirements",
    subtitle: v.employee ? `Between the Employer and ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `This addendum takes effect on ${fmtDate(v.effective_date)} and forms part of the Employee's contract of employment.` },
      { kind: "h", text: "1. Inherent requirement" },
      { kind: "p", text: `The Employee's position requires driving. A valid, current and unrestricted ${v.licence_class || "driver's"} licence is an INHERENT REQUIREMENT of the position. The Employee cannot perform the duties of the position without such a licence.` },
      { kind: "h", text: "2. Duty to maintain licence" },
      { kind: "p", text: "The Employee must maintain a valid driver's licence at all times during employment, at the Employee's own cost, and must renew it timeously." },
      { kind: "h", text: "3. Disclosure duty" },
      { kind: "list", items: [
        "The Employee must immediately (and in any event within 24 hours) disclose IN WRITING any suspension, cancellation, endorsement, restriction, expiry or invalidation of the licence.",
        "The Employee must disclose any AARTO infringement notice, summons, arrest or conviction relating to driving.",
        "The Employee must disclose their accumulated AARTO demerit balance when requested.",
      ]},
      { kind: "h", text: "4. Consent to verification" },
      { kind: "p", text: "The Employee consents to periodic verification of licence status and demerit balance by the Employer, including checks with the RTIA / eNaTIS, on appointment, annually, and after any incident. The Employee consents to the processing of this personal information under the Protection of Personal Information Act." },
      { kind: "h", text: "5. Consequences of loss of licence" },
      { kind: "list", items: [
        "Where the loss results from the Employee's misconduct (repeated infringements, reckless driving, non-disclosure, driving without authority), disciplinary action may follow, up to and including dismissal.",
        "Where the loss occurs without disciplinary fault (for example, demerit-point suspension), an incapacity process will be followed, considering alternatives before dismissal is contemplated.",
        "The Employee may not drive on Employer business while the licence is suspended, cancelled or otherwise invalid.",
      ]},
      { kind: "h", text: "6. Policies incorporated" },
      { kind: "p", text: "The Employer's Driver, Fleet and AARTO Compliance Policies are incorporated into this addendum by reference and bind the Employee." },
      { kind: "h", text: "7. Whole agreement" },
      { kind: "p", text: "This addendum, together with the contract of employment and the policies referred to above, constitutes the whole agreement between the parties on this subject." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 17. Licence-suspension incapacity notice ----------
const licence_incapacity_notice: TemplateDefinition = {
  key: "licence_incapacity_notice",
  name: "Licence-suspension incapacity notice",
  description: "Invite an employee to a meeting to discuss loss of driver's licence as loss of an inherent job requirement.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text", required: true },
    { key: "suspension_date", label: "Date licence was suspended / lost", type: "date", required: true },
    { key: "expected_duration", label: "Expected duration of suspension", type: "text", placeholder: "e.g. 3 months, or unknown pending RTIA process" },
    { key: "meeting_date", label: "Meeting date", type: "date", required: true },
    { key: "meeting_time", label: "Meeting time", type: "text", required: true, placeholder: "e.g. 10:00" },
    { key: "venue", label: "Venue", type: "text", required: true },
  ],
  build: (v) => ({
    type: "licence_incapacity_notice",
    title: "Notice — Incapacity Discussion (Loss of Driver's Licence)",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `The Employer records that your driver's licence was suspended / became invalid on ${fmtDate(v.suspension_date)}. A valid driver's licence is an inherent requirement of your position as ${v.position || "____________"}.` },
      ...(v.expected_duration ? [{ kind: "p" as const, text: `The expected duration of the suspension is: ${v.expected_duration}.` }] : []),
      { kind: "h", text: "Nature of the discussion" },
      { kind: "p", text: "This is NOT a disciplinary hearing. It is an incapacity consultation to discuss the loss of an essential qualification for your position and what, if anything, can be done about it." },
      { kind: "h", text: "Meeting details" },
      { kind: "p", text: `Date: ${fmtDate(v.meeting_date)}   Time: ${v.meeting_time}   Venue: ${v.venue}` },
      { kind: "h", text: "What will be discussed" },
      { kind: "list", items: [
        "The circumstances and expected duration of the licence suspension.",
        "Whether alternative non-driving work is available, temporarily or permanently.",
        "Whether duties can be reallocated for the period of the suspension.",
        "Whether unpaid leave, reduced hours or redeployment is a workable option.",
        "The operational impact on the Employer and any reasonable accommodation.",
        "Only if no workable alternative exists, whether termination of employment on the ground of incapacity is appropriate.",
      ]},
      { kind: "h", text: "Your rights" },
      { kind: "list", items: [
        "You may be represented by a fellow employee or a recognised shop steward.",
        "You may present documentation, including the RTIA notice, medical or other records.",
        "You may propose alternatives.",
        "You will receive a written outcome.",
      ]},
      { kind: "p", text: "Please note that pending the outcome of this consultation you MAY NOT drive any Employer vehicle or drive on Employer business. Alternative arrangements will be made if possible." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 18. Licence disclosure request ----------
const licence_disclosure_request: TemplateDefinition = {
  key: "licence_disclosure_request",
  name: "Licence status disclosure request",
  description: "Formal request to a driving employee to confirm licence status, demerit balance and pending infringements.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "reason", label: "Reason for the request", type: "textarea",
      placeholder: "e.g. Annual verification under the Driver Policy, or following an accident on 12 March." },
    { key: "deadline", label: "Response deadline", type: "date", required: true },
  ],
  build: (v) => ({
    type: "licence_disclosure_request",
    title: "Request for Driver's Licence Disclosure",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: "In terms of your contract of employment and the Employer's Driver / AARTO Policy, you are required to provide the information set out below." },
      ...(v.reason ? [{ kind: "h" as const, text: "Reason for this request" }, ...paragraphs(v.reason)] : []),
      { kind: "h", text: "Information required" },
      { kind: "list", items: [
        "A clear copy of your current driver's licence card (both sides) and its expiry date.",
        "Confirmation in writing that your licence is valid, unrestricted and not suspended or cancelled.",
        "Any endorsements or restrictions currently on your licence.",
        "Your current AARTO demerit-point balance, if known.",
        "Details of any pending AARTO infringement notices, summonses or court dates relating to driving.",
        "Details of any accident, incident or traffic-related arrest since your last disclosure.",
      ]},
      { kind: "h", text: "Consent to verification" },
      { kind: "p", text: "By responding you confirm your consent (as previously given) to the Employer verifying the above information with the RTIA / eNaTIS. The information will be processed in accordance with POPIA and used only for employment-related purposes." },
      { kind: "h", text: "Deadline" },
      { kind: "p", text: `Please provide the requested information by no later than ${fmtDate(v.deadline)}.` },
      { kind: "h", text: "Consequences of non-response or false disclosure" },
      { kind: "p", text: "Failure to respond by the deadline, refusal to consent, or a false or incomplete disclosure will be treated as a breach of your contractual and policy obligations and may result in disciplinary action, up to and including dismissal." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 19. Foreign national visa expiry procedure ----------
const visa_expiry_procedure: TemplateDefinition = {
  key: "visa_expiry_procedure",
  name: "Foreign national visa expiry procedure",
  description: "Full internal HR procedure for managing foreign national employees whose visas or permits have expired or are about to expire — aligned with the Immigration Act, LRA and POPIA.",
  fields: [
    { key: "prepared_date", label: "Date prepared", type: "date", required: true },
    { key: "review_date", label: "Next review date", type: "date", placeholder: "Usually 12 months from preparation" },
  ],
  build: (v) => ({
    type: "visa_expiry_procedure",
    title: "Procedure — Management of Foreign National Employees Whose Work Authorisation Has Expired",
    subtitle: `Prepared: ${fmtDate(v.prepared_date)}${v.review_date ? `  |  Next review: ${fmtDate(v.review_date)}` : ""}`,
    body: [
      { kind: "p", text: "A compliance procedure aligned with the Immigration Act 13 of 2002, the Labour Relations Act 66 of 1995, the Employment Equity Act 55 of 1998, the Basic Conditions of Employment Act 75 of 1997 and the Protection of Personal Information Act 4 of 2013, designed to minimise exposure to unfair dismissal awards at the CCMA arising from statutory illegality." },
      { kind: "p", text: "This procedure is a general compliance framework, not legal advice. South African case law (notably Discovery Health Ltd v CCMA, Sibanda and Others v Roots Butchery, and the Joel line of authority) is highly fact-specific. Legal or immigration counsel should sign off on any decision to place an employee on incapacity proceedings or to terminate under this procedure before that step is taken." },

      { kind: "h", text: "1. Purpose and scope" },
      { kind: "p", text: "This procedure governs how the Employer identifies, monitors and responds to foreign national employees whose work visas, permits, asylum documentation or other statutory authorisation to work in South Africa (\"work authorisation\") has expired, is about to expire, or is otherwise deficient. Its purpose is (a) to meet the Employer's statutory duties under the Immigration Act, and (b) to ensure that any decision to suspend, place on incapacity proceedings or terminate a foreign national employee's employment is substantively and procedurally fair under the LRA." },
      { kind: "p", text: "It applies to all foreign national employees — general work visa, critical skills visa, intra-company transfer visa, corporate visa, and asylum seekers or refugees under the Refugees Act 130 of 1998 — from recruitment through to post-termination record-keeping." },

      { kind: "h", text: "2. Legal framework" },
      { kind: "p", text: "Immigration Act 13 of 2002 — section 38(1) makes it an offence to employ an illegal foreigner or on terms inconsistent with the visa; section 38(2) places a positive, ongoing duty on the Employer to verify status throughout employment; section 49(3) creates criminal liability for knowingly employing an illegal foreigner (fine or up to one year for a first offence, increasing on repetition); regulations require record-keeping and notification to the Department of Home Affairs (\"DHA\") on termination and known breaches." },
      { kind: "p", text: "Labour Relations Act 66 of 1995 — sections 185/188 give every employee the right not to be unfairly dismissed; the correct characterisation of a lapsed-authorisation dismissal is STATUTORY / LEGAL INCAPACITY (external legal impediment preventing performance), not misconduct and not operational requirements (Sibanda). Section 187(1)(f) makes it AUTOMATICALLY UNFAIR to dismiss for reasons of unfair discrimination including ethnic or social origin — decisions must rest strictly on the objective absence of authorisation, not on nationality. Section 213 confirms the person remains an 'employee' for LRA purposes even where the contract may be tainted by illegality (Discovery Health)." },
      { kind: "p", text: "Employment Equity Act 55 of 1998 — section 6 prohibits unfair discrimination. Differentiating strictly on the objective basis of valid versus expired authorisation is not itself unfair discrimination, provided it is applied consistently to employees of all nationalities and is not a proxy for targeting particular nationalities or ethnic groups." },
      { kind: "p", text: "Basic Conditions of Employment Act 75 of 1997 — ordinary notice, remuneration and certificate-of-service obligations continue to apply to any termination under this procedure." },
      { kind: "p", text: "POPIA 4 of 2013 — passport, visa and permit details are personal information. Collect directly from the employee where practicable, for the specified and communicated purpose of verifying work authorisation. Store securely, retain only for as long as necessary, and dispose of securely thereafter." },

      { kind: "h", text: "Key case law" },
      { kind: "list", items: [
        "Discovery Health Ltd v CCMA [2008] 7 BLLR 633 (LC) — a contract with a foreign national is not automatically void because the work permit has lapsed; the employee remains an 'employee' and the CCMA retains jurisdiction. Fair-process obligations cannot be avoided by arguing the contract was a nullity.",
        "Kawalya-Kagwa v Development Bank of Southern Africa [2017] 1 BLLR 33 (LC) — a suspensive condition requiring a valid work permit can lawfully be built into a contract, but it cannot be used as a device to circumvent LRA protections once employment has commenced.",
        "Joel v MEIBC & Others (LC, JR318/15, 24 November 2017) — dismissal unfair where the Employer gave only three days to secure a permit and refused reasonable assistance. An Employer that contributes to or fails to assist in the non-renewal cannot then rely on it to justify dismissal.",
        "Sibanda and Others v Roots Butchery (2025) 46 ILJ 2969 (CCMA) — after a compliance inspection, the Employer gave affected employees roughly one month to regularise and held a disciplinary/incapacity-style enquiry before termination. The CCMA upheld the dismissals as substantively fair and confirmed 'legal incapacity' (not retrenchment) as the correct basis.",
      ]},
      { kind: "p", text: "Fair reason + fair process + no shortcuts by contract — all three must be satisfied. This procedure is built to satisfy all three." },

      { kind: "h", text: "3. Guiding principles" },
      { kind: "list", items: [
        "Verify, don't assume. Every decision must be based on documentary evidence of expiry, verified with the DHA or an authorised verification service — not on assumption, complaint, or an employee's nationality.",
        "Treat this as incapacity, not misconduct. Unless there is separate evidence of dishonesty (e.g. forged documents, deliberate concealment), the employee is not being disciplined; they are being managed because an external legal impediment prevents lawful performance.",
        "Give the employee a reasonable opportunity to regularise their status, with reasonable Employer assistance where practicable.",
        "Consistency: the same process is applied to comparable prior cases across all nationalities.",
        "Confidentiality: all information is processed in accordance with POPIA.",
      ]},

      { kind: "h", text: "4. Roles and responsibilities" },
      { kind: "list", items: [
        "Line manager: flags performance/attendance concerns, supports the employee in attending DHA appointments, does NOT independently warn, suspend or dismiss.",
        "HR / Employee Relations: owns the tracking system, issues all formal correspondence, chairs or arranges the incapacity enquiry, maintains records.",
        "Immigration / Legal counsel: verifies the immigration-law position, reviews the file before any suspension or termination, advises on DHA notification obligations.",
        "Designated enquiry chairperson: an impartial person (not the direct line manager where possible) who considers representations and makes the incapacity determination.",
      ]},

      { kind: "h", text: "5. Step-by-step procedure" },
      { kind: "h", text: "5.1 Pre-employment and onboarding" },
      { kind: "list", items: [
        "Before any offer is finalised, verify the candidate's right to work directly with the DHA or an authorised verification partner. Do not rely solely on documents presented by the candidate.",
        "Record visa/permit type, conditions, employer/occupation restrictions, and expiry date in the central tracking register (5.2).",
        "Include a clear, lawful contractual clause on work-authorisation, disclosure duties and consent to periodic verification.",
      ]},
      { kind: "h", text: "5.2 Central tracking register" },
      { kind: "p", text: "HR maintains a central register recording, per employee: name, position, permit type, permit number, conditions, issue date and EXPIRY DATE, together with a status log (renewal lodged, DHA appointment date, receipt number, outcome). The register drives the reminder cycle below." },
      { kind: "h", text: "5.3 Reminder cycle" },
      { kind: "list", items: [
        "90 days before expiry: written reminder to the employee to lodge renewal, with an offer of reasonable assistance.",
        "60 days before expiry: second reminder plus a status check with the employee.",
        "30 days before expiry: escalation to HR and the direct line manager; confirm the renewal application has been lodged.",
        "14 days before expiry (or on actual expiry, whichever comes first): status review. If a renewal was timeously lodged and is demonstrably still pending through no fault of the employee, EXTEND the monitoring period rather than proceed to an enquiry — DHA processing delays beyond the employee's control weigh heavily in fairness assessments (Joel).",
      ]},
      { kind: "h", text: "5.4 Where authorisation lapses without a satisfactory explanation" },
      { kind: "list", items: [
        "If, on expiry, the employee has no valid authorisation and no credible evidence of a timeously-lodged, still-pending application, HR issues written notice convening an INCAPACITY ENQUIRY, held no sooner than 5 working days later.",
        "The notice must set out: the specific documentation that has expired; that continued employment may render the Employer non-compliant with section 38(1) of the Immigration Act; the right to make written and/or oral representations; the right to be accompanied by a co-employee or trade union representative; and the possible outcomes, including termination for incapacity.",
        "Consider UNPAID LEAVE (rather than suspension or dismissal) pending the outcome of a genuinely pending application — this avoids section 38(1) liability while preserving the relationship.",
      ]},
      { kind: "h", text: "5.5 The incapacity enquiry" },
      { kind: "list", items: [
        "Impartial chairperson (not the direct line manager where possible).",
        "The employee may make representations, present documents, be accompanied, and propose alternatives.",
        "The chair considers alternatives: adjusted duties, redeployment, temporary reallocation, unpaid leave, extended monitoring where a pending renewal is credible.",
        "The chair issues a WRITTEN OUTCOME with reasons and, where applicable, CCMA referral rights.",
      ]},
      { kind: "h", text: "5.6 Termination for statutory incapacity" },
      { kind: "list", items: [
        "Obtain legal/immigration sign-off before finalising a termination decision.",
        "Where the outcome is termination, issue a written letter recording STATUTORY INCAPACITY as the reason, pay BCEA notice pay and accrued leave, and issue a certificate of service.",
        "Termination for statutory incapacity is NOT a s189 retrenchment — severance under s41 BCEA is not required by law, but may be paid as a matter of fairness or established practice.",
      ]},
      { kind: "h", text: "5.7 Post-termination compliance" },
      { kind: "list", items: [
        "Notify the DHA of the termination of the foreign national's employment, as required by the Immigration Act's regulatory framework.",
        "Retain the full file — verification records, correspondence, notices, enquiry minutes and outcome — for the period required by the Immigration Act, consistent with POPIA's data-minimisation and retention principles.",
        "Secure the file so it is accessible only to HR, Legal and Immigration counsel.",
      ]},

      { kind: "h", text: "6. Special circumstances" },
      { kind: "p", text: "Asylum seekers and refugees — persons holding a section 22 asylum seeker permit or refugee status under the Refugees Act 130 of 1998 are entitled to work while their permit remains valid. Permit renewal delays are frequently attributable to DHA backlogs rather than the individual. Additional caution and a longer monitoring window are warranted before any enquiry is convened, and evidence of a timeously-lodged renewal or appeal should ordinarily be treated as a basis for EXTENDING — not shortening — the process." },
      { kind: "p", text: "Employer-caused or contributed delay — where the Employer contributed to or failed to reasonably assist with a renewal (e.g. by refusing supporting documents, delaying paperwork, or giving impossibly short deadlines), a subsequent dismissal is at high risk of being found unfair (Joel). Provide supporting letters, time off for DHA appointments, and reasonable administrative assistance." },
      { kind: "p", text: "Dishonesty — where there is separate evidence of forged documents or deliberate concealment, the matter becomes MISCONDUCT (dishonesty), not statutory incapacity. Follow the disciplinary process, not this procedure." },

      { kind: "h", text: "7. Consistency and non-discrimination safeguards" },
      { kind: "list", items: [
        "Decisions rest strictly on the documented status of work authorisation, applied consistently to employees of all nationalities.",
        "Keep a consolidated case log so HR and Legal can periodically audit for disparate treatment.",
        "Train line managers not to initiate adverse action themselves; every step must run through HR to preserve consistency.",
      ]},

      { kind: "h", text: "8. Record-keeping and POPIA compliance" },
      { kind: "list", items: [
        "Maintain the central expiry-tracking register (5.2), all correspondence, enquiry records and outcome letters in a secure, access-controlled file.",
        "Collect and process personal information only for the stated purpose of verifying and managing work authorisation.",
        "Retain records for the period required by the Immigration Act; thereafter, securely dispose in line with POPIA's retention-limitation principle.",
        "Restrict access to HR, Legal / Immigration counsel and, where strictly necessary, the direct line manager.",
      ]},

      { kind: "h", text: "9. Governance, training and review" },
      { kind: "list", items: [
        "HR must obtain legal / immigration sign-off before issuing an enquiry notice under 5.4 and before any termination under 5.6.",
        "Line managers and HR practitioners must receive periodic training on this procedure and the case law referenced in Section 2.",
        "This procedure is reviewed at least every twelve months, or sooner if the Immigration Act, LRA or relevant case law changes materially.",
      ]},

      { kind: "h", text: "10. Fairness checklist (per matter)" },
      { kind: "list", items: [
        "Expiry verified with DHA or an authorised service (not assumed).",
        "Written reminders issued at 90 / 60 / 30 / 14 days.",
        "Employee given a reasonable opportunity to regularise, with reasonable Employer assistance.",
        "Written notice of incapacity enquiry issued, with charges, rights and possible outcomes.",
        "Impartial chairperson appointed.",
        "Alternatives (adjusted duties, redeployment, unpaid leave, extended monitoring) considered on the record.",
        "Decision based strictly on documentation status, with no reference to nationality or ethnicity.",
        "Same process applied as in comparable prior cases (consistency check).",
        "Written outcome issued with reasons and CCMA referral rights.",
        "Legal / immigration sign-off obtained prior to termination.",
        "DHA notified of termination post-dismissal.",
        "File retained securely in line with the Immigration Act and POPIA.",
      ]},
    ],
    signatures: [
      { label: "Approved by (Executive / HR Director)" },
      { label: "Legal / Immigration Counsel sign-off" },
    ],
  }),
};

// ---------- 20. Visa renewal reminder letter ----------
const visa_reminder_letter: TemplateDefinition = {
  key: "visa_reminder_letter",
  name: "Visa / permit renewal reminder",
  description: "Written reminder to a foreign national employee to lodge a renewal of their work visa or permit, with an offer of reasonable employer assistance (important under Joel).",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "permit_type", label: "Visa / permit type", type: "text", required: true, placeholder: "e.g. General Work Visa, Critical Skills Visa, section 22 asylum permit" },
    { key: "expiry_date", label: "Expiry date", type: "date", required: true },
    { key: "reminder_stage", label: "Reminder stage", type: "select", required: true, options: [
      { value: "90 days", label: "90 days before expiry" },
      { value: "60 days", label: "60 days before expiry" },
      { value: "30 days", label: "30 days before expiry" },
      { value: "14 days", label: "14 days before expiry / on expiry" },
    ]},
    { key: "hr_contact", label: "HR contact person", type: "text", placeholder: "Name and contact details of the HR person to speak to" },
  ],
  build: (v) => ({
    type: "visa_reminder_letter",
    title: "Reminder — Renewal of Work Authorisation",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `Our records show that your ${v.permit_type || "work authorisation"} is due to expire on ${fmtDate(v.expiry_date)} (approximately ${v.reminder_stage || "shortly"} from the date of this letter).` },
      { kind: "h", text: "Why this matters" },
      { kind: "p", text: "In terms of the Immigration Act 13 of 2002, the Employer may not lawfully continue to employ you once your work authorisation has lapsed. This is why we monitor expiry dates and remind you well in advance." },
      { kind: "h", text: "What we ask you to do" },
      { kind: "list", items: [
        "Lodge your renewal application with the Department of Home Affairs (DHA) as soon as possible.",
        "Provide HR with a copy of the receipt or tracking reference for your renewal application.",
        "Keep HR updated on DHA appointment dates and outcomes.",
        "Notify HR IMMEDIATELY of any refusal, delay or additional documentation required.",
      ]},
      { kind: "h", text: "How we will assist you" },
      { kind: "p", text: "The Employer will provide reasonable assistance, including: reasonable time off to attend DHA appointments, a supporting letter confirming your employment, and copies of employment documents you may need in support of your application. If you need any of this, please contact " + (v.hr_contact || "HR") + " without delay." },
      { kind: "h", text: "If renewal is delayed" },
      { kind: "p", text: "If your renewal application has been lodged in good time and is genuinely still pending with the DHA on the expiry date, please provide proof to HR immediately. Where a renewal is credibly pending, the Employer will consider interim measures such as extended monitoring or unpaid leave, rather than moving to a formal incapacity process." },
      { kind: "h", text: "If no renewal is lodged" },
      { kind: "p", text: "If your work authorisation lapses without a timeously-lodged, still-pending renewal, the Employer will convene a formal incapacity consultation to consider the position — including alternatives to termination. Please do not allow it to reach that stage." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 21. Visa incapacity enquiry notice ----------
const visa_incapacity_notice: TemplateDefinition = {
  key: "visa_incapacity_notice",
  name: "Visa expiry — incapacity enquiry notice",
  description: "Formal notice inviting a foreign national employee to an incapacity enquiry after work authorisation has lapsed. Structured as statutory incapacity, not misconduct.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text", required: true },
    { key: "permit_type", label: "Visa / permit type that has expired", type: "text", required: true },
    { key: "expiry_date", label: "Date the authorisation expired", type: "date", required: true },
    { key: "hearing_date", label: "Enquiry date", type: "date", required: true },
    { key: "hearing_time", label: "Enquiry time", type: "text", required: true, placeholder: "e.g. 10:00" },
    { key: "venue", label: "Venue", type: "text", required: true },
    { key: "chair", label: "Chairperson", type: "text" },
  ],
  build: (v) => ({
    type: "visa_incapacity_notice",
    title: "Notice — Incapacity Enquiry (Lapsed Work Authorisation)",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `The Employer records that your ${v.permit_type || "work authorisation"} expired on ${fmtDate(v.expiry_date)}. On the information currently available, there is no timeously-lodged, still-pending renewal application on file.` },
      { kind: "h", text: "Nature of this enquiry" },
      { kind: "p", text: "This is NOT a disciplinary hearing. It is an INCAPACITY enquiry to consider whether an external legal impediment — the absence of valid work authorisation — makes it impossible for you to lawfully perform your position, and if so, whether any workable alternatives to termination exist. The correct legal characterisation is STATUTORY (LEGAL) INCAPACITY under the Labour Relations Act 66 of 1995, following the approach confirmed in Sibanda and Others v Roots Butchery." },
      { kind: "h", text: "Why continued employment is a problem" },
      { kind: "p", text: "In terms of section 38(1) of the Immigration Act 13 of 2002, the Employer may not lawfully employ a person without valid work authorisation. Section 49(3) creates criminal liability for knowingly doing so. The Employer must therefore consider its position without delay." },
      { kind: "h", text: "Enquiry details" },
      { kind: "p", text: `Date: ${fmtDate(v.hearing_date)}   Time: ${v.hearing_time || "____________"}   Venue: ${v.venue || "____________"}` },
      ...(v.chair ? [{ kind: "p" as const, text: `The enquiry will be chaired by ${v.chair}, who will act impartially.` }] : []),
      { kind: "h", text: "What will be considered" },
      { kind: "list", items: [
        "The current status of your work authorisation and any pending renewal application, with supporting documentation.",
        "The reasonable steps you have taken to regularise your status.",
        "The assistance the Employer has offered and any further assistance that may reasonably be provided.",
        "Whether alternative non-affected work or duties are available, temporarily or permanently.",
        "Whether unpaid leave, reduced hours, or an extended monitoring window is a workable interim option pending a credible renewal.",
        "Only if no workable alternative exists — whether termination on the ground of statutory incapacity is appropriate.",
      ]},
      { kind: "h", text: "Your rights" },
      { kind: "list", items: [
        "You may make written and/or oral representations.",
        "You may be accompanied by a fellow employee or a recognised trade union representative.",
        "You may present documentation, including your DHA receipts and correspondence.",
        "You may propose alternatives to termination.",
        "You are entitled to a written outcome with reasons and, where applicable, notice of your CCMA referral rights.",
      ]},
      { kind: "h", text: "Interim position" },
      { kind: "p", text: "Pending the outcome of this enquiry, you may not perform any work that requires valid work authorisation. Alternative arrangements (including unpaid leave) will be considered where appropriate. This interim measure is precautionary and is not itself a sanction." },
      { kind: "p", text: "Failure to attend without good reason may result in the enquiry proceeding in your absence, on the basis of the information available to the Employer." },
    ],
    signatures: sigs(v.employee),
  }),
};

// ---------- 22. Statutory incapacity termination letter ----------
const visa_termination_letter: TemplateDefinition = {
  key: "visa_termination_letter",
  name: "Statutory incapacity termination letter",
  description: "Termination letter for a foreign national employee whose work authorisation has lapsed, on the ground of statutory (legal) incapacity — issued after a fair enquiry.",
  fields: [
    { key: "employee", label: "Employee full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "permit_type", label: "Visa / permit type that has expired", type: "text", required: true },
    { key: "expiry_date", label: "Date the authorisation expired", type: "date", required: true },
    { key: "enquiry_date", label: "Date of incapacity enquiry", type: "date", required: true },
    { key: "last_day", label: "Last day of employment", type: "date", required: true },
    { key: "alternatives_considered", label: "Alternatives considered", type: "textarea",
      placeholder: "Briefly record the alternatives considered at the enquiry (redeployment, unpaid leave, extended monitoring, etc.) and why none was workable." },
    { key: "notice_period", label: "Notice period paid", type: "text", placeholder: "e.g. One calendar month per the contract / BCEA" },
  ],
  build: (v) => ({
    type: "visa_termination_letter",
    title: "Termination of Employment — Statutory Incapacity",
    subtitle: v.employee ? `To: ${v.employee}${v.position ? ` (${v.position})` : ""}` : undefined,
    body: [
      { kind: "p", text: `Following the incapacity enquiry held on ${fmtDate(v.enquiry_date)}, the Employer has decided to terminate your employment on the ground of STATUTORY (LEGAL) INCAPACITY, being the absence of valid work authorisation in South Africa.` },
      { kind: "h", text: "Reason" },
      { kind: "p", text: `Your ${v.permit_type || "work authorisation"} expired on ${fmtDate(v.expiry_date)}. On the information before the chairperson, there is no timeously-lodged, still-pending renewal application, and no workable alternative to termination.` },
      { kind: "p", text: "This decision follows the approach confirmed in Sibanda and Others v Roots Butchery: dismissal for statutory incapacity — an external legal impediment preventing lawful performance — is a fair reason for termination, provided a fair process has been followed. It is not a dismissal for misconduct and it is not a retrenchment under section 189 of the LRA." },
      { kind: "h", text: "Alternatives considered" },
      ...(v.alternatives_considered ? paragraphs(v.alternatives_considered) : [{ kind: "p" as const, text: "Alternatives including redeployment to non-affected duties, unpaid leave pending a credible renewal application, and an extended monitoring window were considered at the enquiry. None was found workable in the circumstances." }]),
      { kind: "h", text: "Effective date and final pay" },
      { kind: "p", text: `Your last day of employment will be ${fmtDate(v.last_day)}. The Employer will pay you ${v.notice_period || "your contractual / BCEA notice pay"}, together with any accrued leave pay and other amounts owing, in accordance with the Basic Conditions of Employment Act.` },
      { kind: "h", text: "Certificate of service and UIF" },
      { kind: "p", text: "A certificate of service will be issued to you. Your UI19 will be submitted so you may claim UIF benefits where you qualify." },
      { kind: "h", text: "Return of company property" },
      { kind: "p", text: "All Employer property in your possession must be returned by your last day of employment." },
      { kind: "h", text: "Right to refer to the CCMA" },
      { kind: "p", text: "You have the right to refer this matter to the CCMA within 30 days of the date of this letter, in terms of the Labour Relations Act. Discovery Health Ltd v CCMA confirms that the CCMA has jurisdiction to hear such a referral even where work authorisation has lapsed." },
      { kind: "h", text: "Regulatory notification" },
      { kind: "p", text: "The Employer will notify the Department of Home Affairs of the termination of your employment as required by the Immigration Act." },
    ],
    signatures: sigs(v.employee),
  }),
};


export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  warning,
  contract,
  dismissal,
  pip,
  leave,
  nda,
  notice_hearing,
  suspension,
  return_to_work,
  grievance_ack,
  retrenchment_s189,
  retrenchment_letter,
  incapacity_notice,
  counselling,
  aarto_policy,
  driver_addendum,
  licence_incapacity_notice,
  licence_disclosure_request,
  visa_expiry_procedure,
  visa_reminder_letter,
  visa_incapacity_notice,
  visa_termination_letter,
];

export function getTemplate(key: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.key === key);
}

/**
 * Fill every empty field of a template with a blank fill-in line so the user
 * can generate a printable, hand-completed template without capturing details.
 * Select fields are left empty on purpose — each builder already has a sensible
 * default wording for them.
 */
export function blankValuesFor(
  def: TemplateDefinition,
  current: Record<string, string> = {},
): Record<string, string> {
  const out: Record<string, string> = { ...current };
  for (const f of def.fields) {
    if (out[f.key]?.trim()) continue;
    out[f.key] = f.type === "select" ? "" : "____________";
  }
  return out;
}
