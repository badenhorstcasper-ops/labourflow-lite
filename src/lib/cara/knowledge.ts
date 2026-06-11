// CARA's built-in knowledge base. Plain-English SA labour-law guidance.
// Each topic has a summary, a steps list, related templates the user may
// want to generate, and follow-up questions surfaced as suggestion chips.
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
  /** Template keys the user will likely need next. First is the primary one. */
  relatedTemplates?: string[];
  /** Likely follow-up questions, rendered as suggestion chips. */
  followUps?: string[];
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
      "Try to make contact: phone, WhatsApp, SMS, email. Log every attempt with date and time.",
      "On day 3 send a written 'return-to-work' letter to their last known address giving them 48 hours to return or explain.",
      "If they don't respond, set a date for a disciplinary hearing in absentia and notify them in writing.",
      "Hold the hearing on the date — record the evidence of absence and the attempts to contact.",
      "If found guilty of desertion, issue a written dismissal letter with the right to refer to the CCMA within 30 days.",
    ],
    relatedTemplates: ["return_to_work", "notice_hearing", "dismissal"],
    followUps: [
      "What if they come back after 10 days with a sick note?",
      "Can I just remove them from payroll?",
      "How do I prove I tried to contact them?",
    ],
    keywords: ["awol", "no show", "no-show", "no call no show", "absent", "desertion", "didn't come", "didn't pitch", "didnt come", "missing", "not at work", "hasn't come", "hasnt come", "ghost", "disappeared"],
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
    relatedTemplates: ["warning", "counselling"],
    followUps: [
      "Can I skip straight to a final written warning?",
      "What if the employee refuses to sign?",
      "How long does a warning stay valid?",
    ],
    keywords: ["warning", "warn", "discipline", "reprimand", "first warning", "final warning", "verbal warning", "written warning"],
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
    relatedTemplates: ["notice_hearing", "dismissal"],
    followUps: [
      "Who can chair the hearing?",
      "Can the employee bring an attorney?",
      "What if the employee doesn't pitch?",
    ],
    keywords: ["hearing", "disciplinary", "charge sheet", "tribunal", "inquiry", "enquiry", "disciplinary action"],
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
    followUps: [
      "Can I send someone else on my behalf?",
      "What's the difference between conciliation and arbitration?",
      "Can I be represented by an attorney at the CCMA?",
    ],
    keywords: ["ccma", "conciliation", "arbitration", "referral", "form 7.11", "commissioner", "unfair dismissal"],
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
    relatedTemplates: ["grievance_ack"],
    followUps: [
      "What if the grievance is against the owner?",
      "Can I refuse to hear a grievance about salary?",
      "How long do I have to respond?",
    ],
    keywords: ["grievance", "complaint", "complaint letter", "unhappy", "raised an issue", "lodged"],
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
    relatedTemplates: ["suspension", "notice_hearing"],
    followUps: [
      "Can I suspend without pay?",
      "How long can a precautionary suspension last?",
      "Do I have to give them a hearing before suspending?",
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
    relatedTemplates: ["retrenchment_s189", "retrenchment_letter"],
    followUps: [
      "How long must the consultation last?",
      "What's the difference between s189 and s189A?",
      "Can I retrench someone on maternity leave?",
    ],
    keywords: ["retrench", "retrenchment", "operational requirements", "s189", "section 189", "downsize", "restructure", "redundant", "redundancy"],
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
    relatedTemplates: ["pip", "counselling", "incapacity_notice"],
    followUps: [
      "How long must a PIP run for?",
      "What if the employee refuses to sign the PIP?",
      "Can a probationer be dismissed more easily for poor performance?",
    ],
    keywords: ["poor performance", "performance", "underperform", "not performing", "pip", "improvement", "underperforming", "useless", "lazy"],
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
    followUps: [
      "Do I have to recognise any union that approaches us?",
      "Can a shop steward call a meeting in work time?",
      "Must I pay an attorney's letter that demands compensation?",
    ],
    keywords: ["union", "shop steward", "attorney", "lawyer", "representative", "rep", "law firm"],
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
    relatedTemplates: ["incapacity_notice", "dismissal"],
    followUps: [
      "Can I dismiss an employee on long sick leave?",
      "Must I pay severance for ill-health dismissal?",
      "What if the employee refuses to attend the medical?",
    ],
    keywords: ["incapacity", "ill health", "ill-health", "illness", "injured", "long sick", "disability", "boarded"],
  },
  {
    key: "probation",
    label: "Probation",
    prompt: "How do I manage and end a probation period properly?",
    summary:
      "Probation is for assessing suitability — not a free pass to dismiss. You must evaluate, give feedback, allow a chance to improve, and follow a less formal but still fair process before terminating.",
    steps: [
      "Set out probation in writing in the contract, with a defined period (usually 3 months).",
      "Evaluate regularly. Document feedback in 1-on-1 meetings.",
      "Where shortcomings appear, raise them with the employee and give clear targets and support.",
      "Before deciding to terminate, hold a probation review meeting. Allow the employee to respond.",
      "If terminating, issue a written termination letter referencing the probation clause and the reasons.",
      "Probationers can still refer disputes to the CCMA, but the standard of fairness applied is less onerous than for confirmed employees.",
    ],
    relatedTemplates: ["counselling", "dismissal", "contract"],
    followUps: [
      "Can I extend probation?",
      "Do I have to give notice when ending probation?",
      "What process applies during the first month?",
    ],
    keywords: ["probation", "probationer", "probationary"],
  },
  {
    key: "resignation",
    label: "Resignation",
    prompt: "An employee has resigned. What must I do?",
    summary:
      "A resignation must be voluntary, unconditional and in writing where possible. Once given, it generally can't be withdrawn without the employer's consent. Honour notice and final pay properly.",
    steps: [
      "Acknowledge the resignation in writing. Confirm the last day of work based on the notice period.",
      "If notice is shorter than the contract, decide whether to waive it or hold the employee to it (you can claim short-notice damages but it's rarely worth it).",
      "Pay out: salary up to the last day, accrued leave, any pro-rata bonus the contract requires.",
      "Issue a certificate of service. A reference letter is optional but good practice.",
      "Hand over UIF UI19 documents promptly to allow the employee to claim where applicable.",
    ],
    relatedTemplates: [],
    followUps: [
      "Can a resignation be withdrawn?",
      "Is resignation in the heat of the moment binding?",
      "Do I have to pay notice if they walk out?",
    ],
    keywords: ["resign", "resignation", "quit", "quitting", "notice", "left", "walked out"],
  },
  {
    key: "sick_leave",
    label: "Sick leave abuse",
    prompt: "I think an employee is abusing sick leave. What can I do?",
    summary:
      "Suspected sick leave abuse is misconduct, but you need evidence. Pattern monitoring + a clear sick-leave policy + requiring a valid medical certificate is the lawful starting point.",
    steps: [
      "Make sure your sick-leave policy is in writing and known: when a certificate is required, what is acceptable, deductions for unauthorised absence.",
      "Section 23 BCEA — you may insist on a medical certificate from a registered practitioner for absences of more than 2 consecutive days, OR more than twice in 8 weeks.",
      "Track patterns (Mondays/Fridays, before/after leave, repeated short absences). Counsel the employee with the pattern in writing.",
      "If a certificate looks suspicious, you may verify it with the practitioner (with the employee's consent, or via the regulator).",
      "If misconduct is proven (fraudulent certificate, dishonest sick leave), follow normal disciplinary process — this is usually serious misconduct.",
    ],
    relatedTemplates: ["counselling", "warning", "notice_hearing"],
    followUps: [
      "How many paid sick days does the BCEA allow?",
      "Can I refuse a sick note from a traditional healer?",
      "Can I deduct the day if there's no certificate?",
    ],
    keywords: ["sick leave", "sick note", "medical certificate", "abuse", "sick", "off sick"],
  },
  {
    key: "hours",
    label: "Working hours & overtime",
    prompt: "What are the rules on working hours and overtime?",
    summary:
      "The BCEA caps ordinary hours at 45 per week (9 per day if working 5 days, 8 if working more). Overtime is voluntary, capped at 10 hours per week, and paid at 1.5x (2x on Sundays / public holidays). These caps don't apply to employees earning above the BCEA threshold.",
    steps: [
      "Confirm whether the employee earns above the BCEA earnings threshold (updated annually by the Minister) — if yes, the hours/overtime sections largely don't apply.",
      "Cap ordinary hours: max 45/week. Daily max: 9 hours (5-day week) or 8 hours (6-day week).",
      "Overtime is only by agreement (usually in the contract). Cap: 10 hours/week. Rate: 1.5x normal wage (2x on Sundays / public holidays unless ordinarily worked).",
      "Give a daily break of 1 hour after 5 continuous hours (may be reduced to 30 minutes by agreement).",
      "Weekly rest: at least 36 consecutive hours, normally including a Sunday.",
      "Keep accurate time records — section 31 BCEA. Failure to keep records is a Department of Employment & Labour offence.",
    ],
    followUps: [
      "What is the current BCEA earnings threshold?",
      "Is travel time considered working time?",
      "Can I average hours over a longer period?",
    ],
    keywords: ["working hours", "overtime", "hours", "bcea", "shift", "shifts", "sunday work", "public holiday work", "time and a half"],
  },
  {
    key: "harassment",
    label: "Sexual harassment",
    prompt: "An employee has reported sexual harassment. What do I do?",
    summary:
      "Sexual harassment in the workplace is unfair discrimination under the EEA. The employer has a positive duty to take immediate, confidential and effective action — failing to do so can make the employer liable.",
    steps: [
      "Take the complaint seriously, in private. Don't investigate it in front of others.",
      "Offer the complainant support: time off, counselling, separation from the alleged harasser pending investigation.",
      "Investigate confidentially and promptly. Get written statements. Preserve digital evidence (messages, emails, CCTV).",
      "Where there is a prima facie case, charge the alleged harasser and convene a disciplinary hearing under your sexual harassment policy / Code of Good Practice on Harassment.",
      "Sanction must be proportionate to seriousness. Confirmed serious harassment generally warrants dismissal.",
      "Protect both parties from victimisation during and after the process. Victimisation itself is automatically unfair.",
    ],
    relatedTemplates: ["suspension", "notice_hearing", "dismissal"],
    followUps: [
      "Can I suspend the alleged harasser while investigating?",
      "What if the complainant doesn't want a formal process?",
      "Can the employer be sued for harassment by an employee?",
    ],
    keywords: ["harassment", "sexual harassment", "harass", "me too", "inappropriate", "molested", "touched"],
  },
];

export function findTopic(textOrKey: string): KnowledgeTopic | undefined {
  const k = textOrKey.trim().toLowerCase();
  if (!k) return undefined;
  // exact key match first
  const byKey = TOPICS.find((t) => t.key === k);
  if (byKey) return byKey;
  // keyword match — prefer the longest matching keyword to avoid false positives
  let best: { topic: KnowledgeTopic; score: number } | undefined;
  for (const t of TOPICS) {
    for (const kw of t.keywords) {
      if (k.includes(kw)) {
        const score = kw.length;
        if (!best || score > best.score) best = { topic: t, score };
      }
    }
  }
  return best?.topic;
}

export function getTopicByKey(key: string): KnowledgeTopic | undefined {
  return TOPICS.find((t) => t.key === key);
}
