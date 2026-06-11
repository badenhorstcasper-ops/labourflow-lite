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
];

export function getTemplate(key: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.key === key);
}
