// CARA's built-in knowledge base. Plain-English SA labour-law guidance
// keyed to the 10 topics on the CARA hub. Each topic maps to a quick answer,
// a legally-required-steps checklist, and (optionally) the document template
// the user is most likely to need next.
//
// This is intentionally local + free to query. Only when no topic and no
// template match do we fall back to the AI edge function.

export type KnowledgeTopic = {
  key: string;
  label: string;          // chip label, shown in the UI
  /** Triggered when the user taps the chip — text "spoken" by the user. */
  prompt: string;
  /** Short headline answer (1–2 sentences). */
  summary: string;
  /** Required / recommended steps in order. */
  steps: string[];
  /** Optional template key from src/lib/documents/templates → enables a
   *  "Create the document" button at the end of the answer. */
  templateKey?: string;
  /** Keywords matched against free-text input. Lower-cased. */
  keywords: string[];
};

export const TOPICS: KnowledgeTopic[] = [
  {
    key: "awol",
    label: "No-show/AWOL",
    prompt: "An employee hasn't come to work and isn't answering. What do I do?",
    summary:
      "An employee who is absent without leave (AWOL) for more than 5 consecutive working days can be dismissed for desertion — but only after a fair process. Don't just take them off the system.",
    steps: [
      "Try to make contact: phone, WhatsApp, SMS, email. Log every attempt.",
      "On day 3 send a written 'return-to-work' letter to their last known address giving them 48 hours to return or explain.",
      "If they don't respond, set a date for a disciplinary hearing in absentia and notify them in writing.",
      "Hold the hearing on the date — record the evidence of absence and the attempts to contact.",
      "If found guilty of desertion, issue a written dismissal letter with the right to refer to the CCMA within 30 days.",
    ],
    templateKey: "warning",
    keywords: ["awol", "no show", "no-show", "absent", "desertion", "didn't come", "missing", "not at work"],
  },
  {
    key: "warning",
    label: "Issue warning",
    prompt: "I need to issue a warning to an employee. How does that work?",
    summary:
      "Warnings are part of progressive discipline: usually verbal → written → final written → dismissal. A warning is only fair if the rule existed, the employee knew it, and they were given a chance to be heard.",
    steps: [
      "Confirm the rule that was broken and that the employee knew it (induction, policy, signed code).",
      "Hold a short counselling discussion — let the employee respond.",
      "Pick the right level: verbal for minor first offences, written for repeats, final written for serious misconduct.",
      "Issue the warning in writing. State the misconduct, the rule, the consequence of repetition, and the validity period (usually 3–6 months).",
      "Sign with the employee and a witness. Keep a copy on file.",
    ],
    templateKey: "warning",
    keywords: ["warning", "warn", "discipline", "reprimand", "first warning", "final warning"],
  },
  {
    key: "hearing",
    label: "Disciplinary hearing",
    prompt: "How do I run a disciplinary hearing?",
    summary:
      "A disciplinary hearing must be fair: the employee must know the charge, have time to prepare, and have the chance to state their case. The chair must be impartial.",
    steps: [
      "Issue a written notice at least 48 hours before the hearing. List each charge with date, place, and rule allegedly broken.",
      "Tell the employee they may bring a fellow employee or shop steward as a representative.",
      "Appoint an impartial chair (not the complainant or their direct manager).",
      "Run the hearing: charges read → employer evidence → employee's case → mitigation → finding → sanction.",
      "Issue the outcome in writing, with the right to appeal (usually within 5 working days).",
      "If the sanction is dismissal, the employee may refer to the CCMA within 30 days.",
    ],
    templateKey: "dismissal",
    keywords: ["hearing", "disciplinary", "charge sheet", "tribunal", "inquiry"],
  },
  {
    key: "ccma",
    label: "CCMA referral",
    prompt: "An employee has referred us to the CCMA. What do I do?",
    summary:
      "Don't ignore it. The CCMA will set a conciliation date within ~30 days. Attend it. If you don't, the matter can proceed in your absence and a default award can be made against you.",
    steps: [
      "Acknowledge receipt of the LRA Form 7.11 and diarise the conciliation date.",
      "Pull together the employee's file: contract, warnings, hearing minutes, dismissal letter, payslips.",
      "Prepare a short timeline of what happened. Stick to facts.",
      "Attend conciliation. Listen first. Settlement at conciliation is private and final — often the cheapest exit.",
      "If conciliation fails, you'll get a certificate. The matter then goes to arbitration (unfair dismissal for misconduct) or the Labour Court (automatically-unfair or operational requirements).",
      "At arbitration, the employer carries the onus to prove the dismissal was substantively and procedurally fair.",
    ],
    keywords: ["ccma", "conciliation", "arbitration", "referral", "form 7.11", "commissioner"],
  },
  {
    key: "grievance",
    label: "Grievance",
    prompt: "An employee has lodged a grievance. How do I handle it?",
    summary:
      "Grievances are the employee's formal way of raising a problem. Ignoring them is itself a workplace issue. Use your grievance procedure (or a simple 3-step one if you don't have one).",
    steps: [
      "Acknowledge the grievance in writing within 2 working days.",
      "Step 1 — line manager meets the employee within 5 working days and gives a written response.",
      "Step 2 — if unresolved, escalate to senior management within a further 5 days.",
      "Step 3 — final internal step is usually the owner / HR head. Outcome in writing.",
      "If still unresolved and it relates to an unfair labour practice, the employee may refer to the CCMA within 90 days.",
    ],
    keywords: ["grievance", "complaint", "complaint letter", "unhappy", "raised an issue"],
  },
  {
    key: "suspension",
    label: "Suspension",
    prompt: "Can I suspend an employee while I investigate?",
    summary:
      "Yes — but precautionary suspension must be on full pay, for serious misconduct only, and only as long as the investigation reasonably takes. Give the employee a chance to respond first.",
    steps: [
      "Send a notice of intention to suspend. List the alleged misconduct and ask why they shouldn't be suspended. Give them 24–48 hours to respond.",
      "Consider the response. If you still proceed, issue a written suspension letter: reason, full pay confirmed, expected duration, contact person.",
      "Investigate without delay — usually 1–2 weeks. Update the employee if it takes longer.",
      "Lift the suspension as soon as the investigation is done, by proceeding to a hearing or returning the employee to work.",
    ],
    keywords: ["suspend", "suspension", "send home", "precautionary"],
  },
  {
    key: "retrenchment",
    label: "Retrenchment",
    prompt: "I'm thinking of retrenching staff. How do I do it lawfully?",
    summary:
      "Retrenchment is dismissal for operational requirements (s189 of the LRA). Process is everything — get the consultation wrong and the dismissal is unfair, even if the business reason is valid.",
    steps: [
      "Issue a s189(3) written notice: reasons, alternatives considered, number affected, selection criteria, timing, severance.",
      "Consult meaningfully with affected employees or their representatives. Try to reach consensus on avoiding / minimising the retrenchments.",
      "Use fair and objective selection criteria (LIFO is most defensible; skills-based is allowed if agreed).",
      "Offer severance pay of at least 1 week per completed year of service, plus notice pay and accrued leave.",
      "Issue written retrenchment letters with the right to refer to the CCMA (or Labour Court if >1 employee and s189A applies).",
    ],
    keywords: ["retrench", "retrenchment", "operational requirements", "s189", "section 189", "downsize", "restructure"],
  },
  {
    key: "performance",
    label: "Poor performance",
    prompt: "An employee isn't performing. What's the right process?",
    summary:
      "Poor performance is not misconduct — you can't just warn and dismiss. The fair process is: standards → assessment → support → reasonable time to improve → review → action.",
    steps: [
      "Define and communicate the performance standard in writing.",
      "Assess the employee's performance against it. Identify specific shortfalls.",
      "Discuss with the employee. Identify causes (training, tools, personal circumstances).",
      "Put a Performance Improvement Plan (PIP) in place — clear objectives, support offered, review date (usually 1–3 months).",
      "Review on the date. If standards are met, close out. If not, consider a further period or move to an incapacity hearing.",
      "Only after the PIP fails may you hold an incapacity hearing and consider dismissal for poor performance.",
    ],
    templateKey: "pip",
    keywords: ["poor performance", "performance", "underperform", "not performing", "pip", "improvement"],
  },
  {
    key: "union",
    label: "Union/attorney",
    prompt: "An employee has brought a union or attorney into a workplace issue. What now?",
    summary:
      "An employee is entitled to be assisted by a registered trade union representative at internal hearings. External attorneys are usually not entitled to attend internal hearings, but may represent at the CCMA in limited cases.",
    steps: [
      "Check whether the union is recognised in your workplace. If yes, follow the recognition agreement.",
      "At internal hearings: a fellow employee or shop steward of a registered union — yes. An outside attorney — generally no, unless your code allows it.",
      "At the CCMA: legal representation is allowed only by agreement, or if the commissioner permits it (usually only for legally complex matters).",
      "Communicate with the union/attorney in writing. Keep records of every exchange.",
      "Don't retaliate. Victimising an employee for being a union member is an automatically unfair dismissal.",
    ],
    keywords: ["union", "shop steward", "attorney", "lawyer", "representative", "rep"],
  },
  {
    key: "incapacity",
    label: "Incapacity",
    prompt: "An employee can't do their job because of illness or injury. What do I do?",
    summary:
      "Incapacity due to ill-health is a fair reason to dismiss — but only after investigating the nature of the illness, the prospect of recovery, and whether alternatives (lighter duties, adapted hours) are possible.",
    steps: [
      "Get the facts: medical certificates, prognosis, duration of absence. Ask the employee's consent to speak to their doctor where needed.",
      "Investigate alternatives: adapted duties, reduced hours, redeployment, unpaid leave.",
      "Consult the employee on the situation and the alternatives. Keep minutes.",
      "If no alternative exists, hold an incapacity hearing. The employee may be represented.",
      "Issue the outcome in writing. If dismissal is the outcome, pay severance for incapacity is not required by law but is good practice for long-serving employees.",
    ],
    keywords: ["incapacity", "ill health", "ill-health", "illness", "injured", "long sick", "disability"],
  },
];

export function findTopic(textOrKey: string): KnowledgeTopic | undefined {
  const k = textOrKey.trim().toLowerCase();
  if (!k) return undefined;
  // exact key match first
  const byKey = TOPICS.find((t) => t.key === k);
  if (byKey) return byKey;
  // keyword match
  return TOPICS.find((t) => t.keywords.some((kw) => k.includes(kw)));
}
