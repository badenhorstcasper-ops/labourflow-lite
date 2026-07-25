// CARA's built-in knowledge base. Plain-English SA labour-law guidance.
// Each topic has a summary, a steps list, related templates the user may
// want to generate, and follow-up questions surfaced as suggestion chips.
//
// This is intentionally local + free to query. Only when no topic and no
// template match do we fall back to the AI edge function.

export type OfficialLink = { label: string; url: string; note?: string };

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
  /** Official government / regulator URLs — rendered as clickable buttons. */
  officialLinks?: OfficialLink[];
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
  {
    key: "aarto_overview",
    label: "AARTO overview",
    prompt: "How does AARTO affect me as an employer?",
    summary:
      "AARTO (the Administrative Adjudication of Road Traffic Offences Act 46 of 1998) replaces criminal prosecution for most traffic offences with an administrative demerit-point system. If a driving employee accumulates too many points, their licence is suspended — and if driving is part of their job, that becomes YOUR labour-law problem, not just theirs.",
    steps: [
      "Understand the demerit system: every infringement carries a penalty AND demerit points. When points exceed the threshold, the licence is suspended. Repeated suspensions can cancel it.",
      "Identify which of your employees drive as an operational requirement (delivery, sales, technicians, fleet, security, managers, field staff).",
      "For those employees, a valid driver's licence is often an INHERENT requirement of the position — losing it can end their ability to do the job.",
      "Remember your OHSA duty of care: you may not lawfully allow an employee with a suspended licence to keep driving. Doing so exposes you to insurance repudiation, civil liability and regulatory action.",
      "Prepare proactively: contract clauses, a driver / AARTO policy, periodic licence verification, and a clear disclosure duty. This is cheaper than reacting to a crisis.",
    ],
    relatedTemplates: ["aarto_policy", "driver_addendum", "licence_disclosure_request"],
    followUps: [
      "How do I know if driving is an inherent requirement of the job?",
      "Can I check my employee's demerit points?",
      "What must a driver / AARTO policy contain?",
    ],
    keywords: ["aarto", "demerit", "demerits", "demerit point", "demerit points", "traffic fine", "traffic fines", "traffic offence", "infringement", "rtia", "road traffic infringement"],
  },
  {
    key: "licence_lost",
    label: "Lost licence: discipline or incapacity?",
    prompt: "My driver has lost his driver's licence. Can I dismiss him?",
    summary:
      "Not automatically. There are TWO possible paths — misconduct or incapacity — and picking the wrong one makes the dismissal unfair. Ask first: did the employee's own conduct cause the loss (misconduct), or did they simply lose an inherent requirement of the job (incapacity)?",
    steps: [
      "Scenario 1 — MISCONDUCT: the employee intentionally or negligently caused the loss (repeated speeding, reckless driving, ignoring infringement notices, driving without authority, failing to disclose the suspension). Charge them and hold a disciplinary hearing. Possible charges: negligence, breach of company policy, bringing the employer into disrepute, failure to obey lawful instructions, dishonesty for non-disclosure.",
      "Scenario 2 — INCAPACITY: the employee no longer holds an essential qualification (licence suspended through demerits, medically disqualified, or statutorily prohibited) without workplace misconduct. Follow an incapacity process, not a disciplinary hearing.",
      "For incapacity, investigate: how long is the suspension, is alternative non-driving work available, can duties be temporarily reallocated, what is the operational impact.",
      "Whichever route you pick, follow a fair procedure: investigate, obtain the RTIA record, allow representations, consider alternatives, weigh length of service and disciplinary record, and document every decision.",
      "Dismissal must be a LAST resort in either scenario. It is never automatic — the LRA still requires substantive and procedural fairness.",
      "Do NOT allow the employee to keep driving a company vehicle in the meantime. That would breach your OHSA duty and likely void your insurance.",
    ],
    relatedTemplates: ["licence_incapacity_notice", "notice_hearing", "suspension", "dismissal"],
    followUps: [
      "What if the suspension is only for 3 months?",
      "Can I move them to a non-driving role instead?",
      "What if they hid the suspension from me?",
    ],
    keywords: ["lost licence", "lost license", "licence suspended", "license suspended", "suspended licence", "suspended license", "licence suspension", "license suspension", "cancelled licence", "cancelled license", "no licence", "no license", "invalid licence", "invalid license", "driver lost", "driver's licence", "drivers licence", "drivers license", "driver's license"],
  },
  {
    key: "licence_hidden",
    label: "Hidden licence suspension",
    prompt: "My employee hid the fact that his licence was suspended. What now?",
    summary:
      "This changes everything. The core issue is no longer the suspended licence — it is DISHONESTY. Concealing a licence suspension, continuing to drive company vehicles, or falsely claiming a valid licence destroys the trust relationship and is normally treated as serious misconduct.",
    steps: [
      "Preserve the evidence: RTIA record, dates the suspension took effect, dates the employee continued to drive, any statements or messages where they confirmed licence validity.",
      "Suspend the employee from driving duties immediately (precautionary suspension may be appropriate for a serious matter).",
      "Charge them with dishonesty and any related misconduct: concealing a material fact, driving without a valid licence, unauthorised use of company vehicles, breach of policy, bringing the employer into disrepute.",
      "Convene a disciplinary hearing. Give proper notice, list every charge, and allow representation.",
      "SA labour law consistently treats dishonesty as capable of destroying trust — dismissal is often a fair sanction, but must still be procedurally correct.",
    ],
    relatedTemplates: ["suspension", "notice_hearing", "dismissal"],
    followUps: [
      "What if they say they didn't know they were suspended?",
      "Can I recover the fines from their salary?",
      "Do I have to report this to their next employer?",
    ],
    keywords: ["hid licence", "hid license", "concealed licence", "concealed license", "hidden suspension", "lied about licence", "lied about license", "didn't disclose licence", "didnt disclose licence", "false licence", "false license"],
  },
  {
    key: "aarto_disclosure",
    label: "AARTO disclosure & licence checks",
    prompt: "Can I make my drivers disclose their fines and demerits?",
    summary:
      "Yes — where driving is part of the job, you may lawfully require employees to disclose licence suspensions, cancellations, endorsements, relevant traffic convictions and (where operationally relevant) their demerit balance. You must do it through the contract or a policy, and you must comply with POPIA when processing the information.",
    steps: [
      "Put the disclosure duty in writing: employment contract, driver policy, fleet policy or code of conduct. Verbal duties are unenforceable.",
      "Get the employee's consent to periodic licence verification (RTIA / eNaTIS check) and record it — this is POPIA compliance.",
      "Verify licences at least annually, and immediately after any incident (accident, fine, complaint).",
      "Require IMMEDIATE written disclosure of any suspension, cancellation or endorsement. Set a deadline (usually 24-48 hours from becoming aware).",
      "Store the information securely, use it only for the stated purpose, and don't share it beyond the people who need it — POPIA again.",
      "If the employee refuses to disclose or consent, treat it as a breach of contract / policy and follow a disciplinary process.",
    ],
    relatedTemplates: ["licence_disclosure_request", "aarto_policy", "driver_addendum"],
    followUps: [
      "Do I need the employee's consent to check their licence?",
      "How often should I verify licences?",
      "What if the employee refuses to sign the disclosure clause?",
    ],
    keywords: ["disclose licence", "disclose license", "licence check", "license check", "licence verification", "license verification", "check demerits", "check licence", "check license", "popia licence", "popia license", "driver disclosure"],
  },
  {
    key: "driver_policy",
    label: "Driver & fleet policies",
    prompt: "What policies do I need for drivers and company vehicles?",
    summary:
      "If your business has drivers or company vehicles, four documents work together: a Driver Policy, a Fleet Management Policy, an AARTO Compliance Policy, and matching entries in your Disciplinary Code. Without them you cannot fairly discipline a driver, and your insurance may repudiate a claim.",
    steps: [
      "Driver Policy: licence verification, annual re-checks, reporting obligations, alcohol and drug testing (where lawful), pre-trip vehicle inspections, driver competence and training.",
      "Fleet Management Policy: vehicle allocation, fuel cards, treatment of traffic fines, authorised drivers list, telematics / tracking, accident and incident reporting.",
      "AARTO Compliance Policy: reporting of infringement notices, employer notification, demerit monitoring, licence suspension procedures, internal investigations, POPIA handling of driver data.",
      "Disciplinary Code additions: failure to disclose licence suspension, driving without a valid licence, unauthorised use of a company vehicle, repeated traffic violations, gross negligence behind the wheel.",
      "Roll out properly: publish, train managers, get signed acknowledgements from every driving employee, and review annually.",
    ],
    relatedTemplates: ["aarto_policy", "driver_addendum"],
    followUps: [
      "Can I deduct traffic fines from an employee's salary?",
      "Can I install a tracker in a company vehicle?",
      "Do I need the employee's consent for alcohol testing?",
    ],
    keywords: ["driver policy", "fleet policy", "fleet management", "aarto policy", "company vehicle policy", "vehicle policy", "driving policy"],
  },
  {
    key: "driving_inherent_requirement",
    label: "Licence as inherent job requirement",
    prompt: "When is a driver's licence an inherent requirement of the job?",
    summary:
      "A driver's licence is an INHERENT requirement whenever an employee cannot perform their contractual duties without it — sales reps, delivery drivers, technicians, fleet operators, security response, field service, and often managers. Marking it as such in the contract makes both discipline and incapacity dismissals defensible.",
    steps: [
      "Audit every position: can the person actually do the job without a valid licence? If no, driving is inherent.",
      "State it clearly in the employment contract: 'A valid Code X driver's licence is an inherent requirement of the position. Loss or suspension may affect continued employment.'",
      "Add the disclosure duty and consent to periodic verification in the same clause.",
      "Refer to the driver / fleet / AARTO policy in the contract so those policies bind the employee.",
      "When a licence is lost, having this clause makes an incapacity dismissal (loss of an essential qualification) much easier to defend at the CCMA.",
      "Check your insurance policy: most insurers exclude cover where the driver is unlicensed or breaching the law. Your contract and policy must align with your cover.",
    ],
    relatedTemplates: ["driver_addendum", "contract", "aarto_policy"],
    followUps: [
      "What if the employee was hired without a licence being required, but now needs to drive?",
      "Do I have to find alternative work for a driver who loses their licence?",
      "Can I make holding a licence a condition of promotion?",
    ],
    keywords: ["inherent requirement", "essential qualification", "licence required", "license required", "must have licence", "must have license", "driving job", "driver job"],
  },
  {
    key: "visa_overview",
    label: "Foreign national visa overview",
    prompt: "How do I manage foreign national employees whose visas or permits are expiring?",
    summary:
      "The Immigration Act 13 of 2002 makes it a criminal offence to employ anyone without valid work authorisation, and places an ongoing duty on you to verify status throughout the employment — not just at hire. But labour law still requires a fair reason and a fair process to dismiss. The correct legal characterisation is STATUTORY (LEGAL) INCAPACITY — not misconduct, and not retrenchment.",
    steps: [
      "Verify, don't assume. Every decision must be based on documentary evidence of expiry or lapse, verified with the Department of Home Affairs (DHA) or an authorised verification service — not on assumption, complaint, or the employee's nationality.",
      "Treat as INCAPACITY, not misconduct. Unless there is separate evidence of dishonesty (forged documents, deliberate concealment), the employee is not being disciplined — they are being managed because an external legal impediment prevents lawful performance.",
      "Give the employee a genuine opportunity to regularise their status, with reasonable employer assistance where practicable. Refusing to help can itself make a later dismissal unfair (see Joel).",
      "Do NOT rely on an automatic-termination or suspensive-condition clause to skip a fair process once employment has commenced (Kawalya-Kagwa). Discovery Health confirms the CCMA still has jurisdiction, even if the permit has lapsed.",
      "Get legal / immigration sign-off before issuing an enquiry notice, and again before any termination decision.",
      "Notify the DHA of the termination of a foreign national's employment, retain the full file, and process the personal information in line with POPIA.",
    ],
    relatedTemplates: ["visa_expiry_procedure", "visa_reminder_letter", "visa_incapacity_notice"],
    followUps: [
      "What is 'statutory incapacity' and why does it matter?",
      "Can I just terminate on the day the visa expires?",
      "Do I have to help the employee renew their permit?",
    ],
    keywords: ["visa", "work visa", "work permit", "permit", "foreign national", "foreigner", "immigration", "home affairs", "dha", "critical skills", "intra-company", "corporate visa", "general work visa"],
  },
  {
    key: "visa_expired",
    label: "Expired visa — what to do",
    prompt: "My employee's work visa has expired. What do I do?",
    summary:
      "Don't just remove them from payroll — Discovery Health confirms the CCMA still has jurisdiction. Follow the statutory-incapacity route: monitor → written notice → incapacity enquiry → decision. Consider unpaid leave as an interim step where a renewal is genuinely still pending with the DHA.",
    steps: [
      "Confirm the expiry objectively — copy of the permit, DHA / authorised verification. Do not act on hearsay.",
      "Ask the employee for evidence of any timeously-lodged renewal application. Genuine, still-pending DHA delays weigh heavily in favour of the employee (see Joel and the guidance on asylum permits below).",
      "If there is no valid authorisation and no credible pending application, issue a written notice convening an INCAPACITY ENQUIRY, to be held no sooner than 5 working days later.",
      "The notice must state: the specific documentation that has expired; that continued employment may render the Employer non-compliant with section 38(1) of the Immigration Act; the employee's right to make written and/or oral representations; the right to be accompanied by a co-employee or trade union representative; and the possible outcomes, including termination for incapacity.",
      "Consider UNPAID LEAVE (rather than suspension or dismissal) pending the outcome of a genuinely pending application — this protects you from section 38(1) liability while preserving the employment relationship.",
      "Hold the enquiry. Impartial chair (not the direct line manager where possible). Consider alternatives: adjusted duties, redeployment, unpaid leave, an extended monitoring window.",
      "Obtain legal/immigration sign-off before any termination. If termination is the outcome, issue a written letter for STATUTORY INCAPACITY, pay BCEA notice pay and accrued leave, issue a certificate of service, and notify the DHA.",
    ],
    relatedTemplates: ["visa_reminder_letter", "visa_incapacity_notice", "visa_termination_letter", "visa_expiry_procedure"],
    followUps: [
      "Can I put them on unpaid leave instead of dismissing?",
      "Do I have to pay notice pay on a statutory incapacity termination?",
      "What if renewal is stuck at Home Affairs?",
    ],
    keywords: ["expired visa", "expired permit", "expired work permit", "expired work visa", "visa lapsed", "permit lapsed", "visa expiry", "permit expiry", "lapsed visa", "lapsed permit", "visa expired", "permit expired"],
  },
  {
    key: "asylum_permit",
    label: "Asylum & refugee permits",
    prompt: "My employee is an asylum seeker and their permit renewal is stuck at Home Affairs. What do I do?",
    summary:
      "Holders of a section 22 asylum seeker permit or refugee status under the Refugees Act 130 of 1998 are entitled to work while their permit is valid. DHA backlogs on renewals are common and are usually NOT the employee's fault — extra caution and a longer monitoring window are required before you convene any enquiry.",
    steps: [
      "Ask the employee for evidence of the timeously-lodged renewal or appeal — receipt slip, appointment confirmation, tracking reference. Keep copies on file.",
      "If a renewal is demonstrably pending through no fault of the employee, EXTEND the monitoring period rather than proceed to an enquiry. DHA processing delays weigh heavily in fairness assessments (Joel).",
      "Offer reasonable assistance — time off to attend DHA appointments, a supporting letter from the Employer, help gathering documentation. Refusal to assist has been held to make a subsequent dismissal unfair.",
      "Only if the permit has clearly lapsed with no credible pending application should you move to the standard statutory-incapacity procedure (see 'Expired visa — what to do').",
      "Never differentiate on nationality or ethnicity. Section 187(1)(f) of the LRA makes that AUTOMATICALLY UNFAIR — uncapped compensation. The decision must rest strictly on the objective absence of work authorisation.",
    ],
    relatedTemplates: ["visa_reminder_letter", "visa_incapacity_notice", "visa_expiry_procedure"],
    followUps: [
      "How long should I keep them on while renewal is pending?",
      "Can I put them on unpaid leave while waiting for DHA?",
      "Do I have to write a supporting letter for their DHA appointment?",
    ],
    keywords: ["asylum", "asylum seeker", "refugee", "section 22", "refugees act", "dha backlog", "home affairs backlog", "renewal pending", "permit renewal"],
  },
  {
    key: "visa_verification",
    label: "Verification & POPIA",
    prompt: "How do I lawfully check my foreign employees' work authorisation?",
    summary:
      "Section 38(2) of the Immigration Act places a positive, ONGOING duty on you to verify status throughout the employment. Passport, visa and permit details are personal information under POPIA — collect them for the specified purpose, store them securely, and don't keep them longer than needed.",
    steps: [
      "Before finalising any offer, verify the candidate's right to work directly with the DHA or an authorised verification partner — do NOT rely solely on documents presented by the candidate.",
      "Record the visa/permit type, conditions, employer/occupation restrictions and expiry date in a central expiry-tracking register.",
      "Diarise reminders: 90 days, 60 days, 30 days and 14 days before expiry. Issue written renewal reminders to the employee.",
      "Collect the information directly from the employee where practicable, for the stated purpose of verifying work authorisation. Get consent to periodic re-verification.",
      "Store the file in an access-controlled location. Access is limited to HR, Legal / Immigration counsel and, where strictly necessary, the direct line manager.",
      "Retain records for the period required by the Immigration Act. Thereafter, securely dispose of the personal information in line with POPIA's retention-limitation principle.",
    ],
    relatedTemplates: ["visa_expiry_procedure", "visa_reminder_letter"],
    followUps: [
      "How often should I re-verify visas?",
      "Can I keep a copy of the passport on file forever?",
      "Who in the business is allowed to see this information?",
    ],
    keywords: ["visa verification", "permit verification", "verify visa", "verify permit", "immigration verification", "popia visa", "popia permit", "dha verification", "section 38"],
  },
  {
    key: "visa_dismissal_fairness",
    label: "Visa dismissal fairness checklist",
    prompt: "Have I done enough to fairly dismiss a foreign employee whose visa has lapsed?",
    summary:
      "Three tests must all be satisfied: FAIR REASON (Discovery Health, Sibanda), FAIR PROCESS (Joel, Sibanda), and NO SHORTCUTS BY CONTRACT (Kawalya-Kagwa). Getting any one of these wrong exposes you to an unfair dismissal award — and if the decision was really based on nationality, an AUTOMATICALLY unfair dismissal with uncapped compensation.",
    steps: [
      "Fair reason: the objective, verified absence of valid work authorisation is a legitimate, non-discriminatory reason for dismissal — but ONLY where you can prove it with DHA or authorised-verification records.",
      "Fair process: written notice, adequate time to prepare, a genuine opportunity to regularise (with reasonable employer assistance where practicable), an impartial chairperson, right to representation, and a written outcome.",
      "No shortcuts by contract: automatic-termination or suspensive-condition clauses do NOT remove the need for a fair process once employment has commenced.",
      "Consistency: the same process must be applied as in comparable prior cases — audit your case log for disparate treatment between nationalities.",
      "Correct legal characterisation: STATUTORY INCAPACITY, not misconduct and not retrenchment. Using the wrong label often makes the dismissal procedurally unfair on its own.",
      "Legal / immigration sign-off obtained before the enquiry notice, and again before the final termination decision. DHA notified of the termination afterwards. Full file retained.",
    ],
    relatedTemplates: ["visa_incapacity_notice", "visa_termination_letter", "visa_expiry_procedure"],
    followUps: [
      "What are the leading cases I need to know?",
      "What must the written outcome include?",
      "What is 'automatically unfair' and how do I avoid it?",
    ],
    keywords: ["visa dismissal", "permit dismissal", "foreign dismissal", "statutory incapacity", "legal incapacity", "discovery health", "sibanda", "roots butchery", "kawalya-kagwa", "joel"],
  },

  // ===================================================================
  // Government online tools & services (Dept of Employment & Labour)
  // Source: https://www.labour.gov.za/Online-Tools (verified July 2026)
  // ===================================================================
  {
    key: "gov_tools_overview",
    label: "Government online tools",
    prompt: "What online tools and services does the Department of Employment and Labour have, and where do I find them?",
    summary:
      "The Department of Employment and Labour (DEL) runs a set of official online services for UIF, Compensation Fund, Employment Equity, public employment (job matching), and inspections. Use these official links directly — do not use unofficial third-party sites.",
    steps: [
      "Register once for a DEL account (SAP Diphetogo) — that login is reused across Inspection & Enforcement, Collective Bargaining, National Minimum Wage, BCEA and some UIF services.",
      "For UIF contributions and benefit claims: use uFiling.",
      "For workplace-injury (COIDA) claims and Letters of Good Standing: use ROE Online + CompEasy.",
      "For annual Employment Equity reports (EEA2, EEA4, EEA12, EEA13): use the EE online portal.",
      "For posting vacancies or registering job seekers: use ESSA (Public Employment Services).",
      "For raising a complaint or tracking a call-centre query: use the Web Self-Service Ticketing system.",
    ],
    officialLinks: [
      { label: "DEL Online Tools index", url: "https://www.labour.gov.za/Online-Tools" },
      { label: "DEL account registration (SAP Diphetogo)", url: "https://crs.labour.gov.za/sap/bc/ui5_ui5/sap/zcommreg_new/index.html" },
      { label: "uFiling (UIF)", url: "https://uifonline.labour.gov.za/uifOnline" },
      { label: "ROE Online (Compensation Fund)", url: "https://www.labour.gov.za/Online-Tools/Pages/ROE-Online-(cfonline-labour-gov-za).aspx" },
      { label: "CompEasy (COID claims)", url: "https://compeasy.labour.gov.za:44328/fiori" },
      { label: "Employment Equity online reports", url: "https://ee.labour.gov.za/dmiso/" },
      { label: "ESSA – Public Employment Services", url: "https://essa.labour.gov.za/EssaOnline/WebBeans/" },
      { label: "Labour Market Info System (stats)", url: "https://de-lmis.labour.gov.za/" },
      { label: "Contact-centre ticketing", url: "https://ccselfservice.labour.gov.za/#/sessions/signin" },
    ],
    followUps: [
      "How do I register on uFiling?",
      "Where do I submit my Return of Earnings?",
      "How do I lodge a UIF claim?",
    ],
    keywords: ["gov tools", "government tools", "labour.gov", "labour gov", "online tools", "department of labour", "department of employment", "del portal", "official portal", "official links"],
  },
  {
    key: "ufiling",
    label: "UIF (uFiling)",
    prompt: "How do I use uFiling for UIF contributions or a UIF claim?",
    summary:
      "uFiling is the UIF's official online portal. Employers use it to declare and pay monthly UIF contributions. Employees use it to claim unemployment, illness, maternity, adoption or dependant's benefits.",
    steps: [
      "Go to the official uFiling site — do not use lookalike third-party sites.",
      "Employer: register your business, capture employees (UI-19), and submit/pay monthly UIF contributions on time (1% employer + 1% employee, up to the earnings ceiling).",
      "Employee: register with your ID number, upload supporting documents (ID, bank confirmation, UI-19 from employer, medical certificate/birth certificate where relevant) and lodge the claim.",
      "Track the claim inside uFiling. If it stalls, log a ticket via the Web Self-Service Ticketing system or phone the UIF call centre on 0800 030 007.",
      "Claims should generally be lodged within 12 months of losing income — do not delay.",
    ],
    officialLinks: [
      { label: "uFiling portal", url: "https://uifonline.labour.gov.za/uifOnline" },
      { label: "Log a UIF query (ticket)", url: "https://ccselfservice.labour.gov.za/#/sessions/signin" },
      { label: "UIF e-Compliance Certificate", url: "https://uifcompliance.labour.gov.za/acc/", note: "May be temporarily unavailable — retry or call 0800 030 007." },
    ],
    followUps: [
      "What UI-19 information must I give my employee?",
      "How long do UIF payments last?",
      "How do I get a UIF compliance certificate for a tender?",
    ],
    keywords: ["ufiling", "u-filing", "uif", "unemployment insurance", "ui19", "ui-19", "uif claim", "uif contribution", "uif compliance"],
  },
  {
    key: "compensation_fund",
    label: "Compensation Fund (COIDA / ROE / CompEasy)",
    prompt: "How do I register with the Compensation Fund, submit Return of Earnings, or claim for a workplace injury?",
    summary:
      "The Compensation Fund covers workplace injuries and diseases under COIDA. Employers must register, submit an annual Return of Earnings (ROE), and manage injury claims through CompEasy. A valid Letter of Good Standing (LOGS) is often needed for tenders and contracts.",
    steps: [
      "Register the organisation on the Compensation Fund online portal (once per business).",
      "Submit the annual Return of Earnings (ROE) online — declares total employee earnings, on which the assessment is calculated.",
      "Pay the assessment on time. Then apply for a Letter of Good Standing (LOGS) — download or verify it via the Verify LOGS site.",
      "For any workplace injury or occupational disease: report it and lodge the claim through CompEasy (the Fund's claims system). Attach medical reports and the employer's report of the accident.",
      "Keep support emails on file — ROEonlinesupport@labour.gov.za for ROE, CompEasySupport@labour.gov.za for CompEasy.",
    ],
    officialLinks: [
      { label: "ROE Online hub", url: "https://www.labour.gov.za/Online-Tools/Pages/ROE-Online-(cfonline-labour-gov-za).aspx" },
      { label: "Compensation Fund employer registration", url: "https://cfonline.labour.gov.za/OnlineSubmissions/wicket/bookmarkable/za.gov.labour.cf.RegisterOrganization" },
      { label: "ROE submission portal", url: "https://cfonline.labour.gov.za/OnlineSubmissions" },
      { label: "Verify Letter of Good Standing", url: "https://cfonline.labour.gov.za/VerifyLOGS/" },
      { label: "CompEasy (COID claims)", url: "https://compeasy.labour.gov.za:44328/fiori" },
      { label: "Employer obligations under COIDA", url: "http://www.labour.gov.za/compensation-fund-obligations-of-the-employer" },
    ],
    followUps: [
      "How do I get a Letter of Good Standing?",
      "When must I report a workplace injury?",
      "What earnings must I include in the ROE?",
    ],
    keywords: ["compensation fund", "coida", "workman", "workmen", "workplace injury", "injury on duty", "iod", "roe", "return of earnings", "compeasy", "letter of good standing", "logs"],
  },
  {
    key: "employment_equity_reports",
    label: "Employment Equity online reporting",
    prompt: "How do I submit our annual Employment Equity report?",
    summary:
      "Designated employers must submit annual Employment Equity reports (EEA2 and EEA4) online through the DEL's EE portal. The EE analysis (EEA12) and EE plan (EEA13) are submitted in a different window — follow the current-year deadlines shown on the portal.",
    steps: [
      "Register on the EE online portal. Activation links are sent to the CEO and the EE Manager — both must be captured correctly.",
      "Log in and complete EEA2 (workforce profile, income differentials) and EEA4 (income data) for the reporting year.",
      "Submit by the annual deadline shown on the portal (e.g. 15 January for the prior year's reports).",
      "Submit EEA12 (analysis) and EEA13 (EE plan) in the separate reporting window — the portal shows current dates.",
      "Keep the submission acknowledgement — you may be asked for it during a DEL inspection.",
    ],
    officialLinks: [
      { label: "Employment Equity online portal", url: "https://ee.labour.gov.za/dmiso/" },
      { label: "DEL Online Tools index", url: "https://www.labour.gov.za/Online-Tools" },
    ],
    followUps: [
      "Am I a 'designated employer'?",
      "What's the difference between EEA2, EEA4, EEA12 and EEA13?",
      "What are the current EE numerical targets for my sector?",
    ],
    keywords: ["employment equity", "ee report", "eea2", "eea4", "eea12", "eea13", "designated employer", "ee plan", "equity report"],
  },
  {
    key: "essa_public_employment",
    label: "Public Employment Services (ESSA)",
    prompt: "How do I register a vacancy on ESSA, or register as a job seeker?",
    summary:
      "ESSA (Employment Services of South Africa) is the DEL's free job-matching platform. Employers register an organisation and post vacancies; job seekers register a profile and are matched to opportunities. It's free.",
    steps: [
      "Individual (job seeker or employer contact person): register as an Individual on ESSA first.",
      "Employer: after registering as an Individual, register your Organisation. You'll need to link it with a UIF reference number.",
      "Post a vacancy with role, requirements and location. ESSA returns matched CVs.",
      "Job seeker: upload your CV, keep contact details up to date, and apply for matched vacancies inside ESSA.",
    ],
    officialLinks: [
      { label: "ESSA portal", url: "https://essa.labour.gov.za/EssaOnline/WebBeans/" },
      { label: "DEL Online Tools index", url: "https://www.labour.gov.za/Online-Tools" },
    ],
    followUps: [
      "Is ESSA really free for employers?",
      "Do I have to be UIF-registered to post a vacancy?",
      "What documents does a job seeker need?",
    ],
    keywords: ["essa", "public employment", "pes", "job seeker", "post vacancy", "advertise vacancy", "job matching", "employment services"],
  },
  {
    key: "labour_complaint",
    label: "Complaint / Inspection (IES)",
    prompt: "How do I lodge a complaint with the Department of Employment and Labour, or track an inspection?",
    summary:
      "Complaints about labour-law compliance (BCEA, EEA, NMW, UIF, COIDA) are handled by DEL's Inspection and Enforcement Services (IES). Register a DEL account first, then log the complaint or query through the shared portal or the Web Self-Service Ticketing system.",
    steps: [
      "Register a DEL account (SAP Diphetogo) if you don't have one.",
      "Log the complaint via the IES portal or the Web Self-Service Ticketing system — capture facts, dates and any documents.",
      "Keep the reference number. Follow up in writing if there is no response within a reasonable time.",
      "Serious matters (unfair dismissal, unfair labour practice) are usually referred to the CCMA, not IES — IES deals with compliance inspections and enforcement.",
    ],
    officialLinks: [
      { label: "Inspection & Enforcement portal", url: "https://crs.labour.gov.za/crshome", note: "Landing page can be intermittent — log in via the DEL account portal if it fails." },
      { label: "DEL account portal", url: "https://crs.labour.gov.za/sap/bc/ui5_ui5/sap/zcommreg_new/index.html" },
      { label: "Web Self-Service Ticketing", url: "https://ccselfservice.labour.gov.za/#/sessions/signin" },
    ],
    followUps: [
      "Should I go to IES or the CCMA?",
      "How long does an inspection take?",
      "Can I lodge a complaint anonymously?",
    ],
    keywords: ["complaint", "labour inspector", "ies", "inspection", "enforcement", "report employer", "labour department complaint", "del complaint"],
  },
  {
    key: "labour_market_stats",
    label: "Labour market statistics (LMIS)",
    prompt: "Where can I find official South African labour market statistics?",
    summary:
      "The Labour Market Information System (LMIS) is DEL's public data portal — employment, unemployment, NEET, inspections, work stoppages and more. It's a data-viewing tool, not a transactional service.",
    steps: [
      "Open the LMIS portal.",
      "Browse or search by indicator (employment, unemployment, sector, province).",
      "Export or share the data you need for reports or planning.",
    ],
    officialLinks: [
      { label: "Labour Market Information System", url: "https://de-lmis.labour.gov.za/" },
    ],
    followUps: [
      "What's the current unemployment rate?",
      "Where do I find sectoral employment data?",
    ],
    keywords: ["lmis", "labour statistics", "labour market data", "unemployment rate", "employment stats"],
  },

  // ===================================================================
  // Employment Services Amendment Bill, 2026 (B 16—2026)
  // Gazette 54743 of 26 May 2026 — NOT YET IN FORCE
  // ===================================================================
  {
    key: "esa_bill_2026",
    label: "Employment Services Amendment Bill 2026",
    prompt: "What does the Employment Services Amendment Bill of 2026 mean for employers?",
    summary:
      "The Employment Services Amendment Bill, 2026 (B 16—2026, published in Government Gazette 54743 on 26 May 2026) will amend the Employment Services Act, 2014. It is NOT YET IN FORCE — it starts on a date the President proclaims in the Gazette. Its biggest impact is on employers of foreign nationals: skills-transfer plans, ministerial quotas per sector, and stricter enforcement.",
    steps: [
      "Wider scope: the Act will cover foreign nationals, private employment agencies that don't operate for gain, and 'workers' (a new, broader category than 'employee').",
      "New definitions matter: 'asylum seeker', 'refugee', 'permanent resident', 'illegal foreigner', 'critical skills', 'worker' and 'employer' are inserted or expanded.",
      "Foreign nationals: before recruiting a foreign national, employers may be required to show there is no South African, permanent resident or refugee available with suitable skills, and to make use of public employment services (ESSA) or a private agency to test the market.",
      "Skills transfer plans: employers of foreign nationals may be required to prepare a skills transfer plan for each position filled by a foreign national. The Minister can exempt categories on the Board's advice.",
      "Ministerial quotas: the Minister (after consulting the Employment Services Board) may set maximum quotas for the employment of foreign nationals in specified sectors, occupational categories or areas. Employers may apply for exemptions.",
      "Enforcement: new offences and stronger enforcement powers relating to work by foreign nationals, in step with the Immigration Act and Refugees Act.",
      "Supported Employment Enterprises: governance is restructured; the head reports to the Director-General (not the Minister).",
      "What to do now: audit your foreign-national workforce, tighten visa verification (DHA or authorised verification), keep records showing you tried to recruit South Africans first, and start thinking about skills-transfer plans. Watch the Gazette for the commencement proclamation.",
    ],
    officialLinks: [
      { label: "DEL — Employment Services", url: "https://www.labour.gov.za/" },
      { label: "Parliament Bills tracker", url: "https://www.parliament.gov.za/bills-explained" },
    ],
    relatedTemplates: ["visa_expiry_procedure", "visa_reminder_letter", "visa_incapacity_notice"],
    followUps: [
      "How do quotas for foreign nationals work?",
      "What must a skills transfer plan contain?",
      "Is my current use of foreign nationals still legal?",
      "When does the Bill come into force?",
    ],
    keywords: [
      "employment services amendment", "esa bill", "esa amendment", "b 16", "b16-2026", "b16 2026", "gazette 54743",
      "amendment bill 2026", "employment services bill", "labour migration bill", "foreign national quota",
      "skills transfer plan", "supported employment enterprises",
    ],
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
