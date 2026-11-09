// Curated reference data, not model-generated. Mirrored in src/lib/cara/legal2026.ts.
export const LEGAL_2026 = {
  minimumWage: { amount: 30.23, effective: "2026-03-01", gazette: "54075", notice: "R.7083" },
  // Published sources conflict with the requested R269,900.90. Do not silently certify it.
  bceaThreshold: { amount: 269600.90, effective: "2026-05-01", requestedAmount: 269900.90, confirmationRequired: true },
  coidaLimit: { amount: 668000, effective: "2026-03-01", until: "2027-02-28", gazette: "54577" },
  dismissalCode: "Code of Good Practice: Dismissal (Notice 3470, Gazette 53294, September 2025)",
  ccma: { gazette: "55620", notice: "4208", meetingDays: 14, minutesDays: 7, documentRequestDays: 14, responseDays: 5, firstDayFee: 7524, subsequentDayFee: 4911.50, includesVat: true, discloseAi: true, deliveryChannels: ["WhatsApp", "SMS"], deliberateAbsenceMayDismiss: true },
} as const;

export const LEGAL_SAFETY_PROMPT = `STRICT SOURCE AND INDUSTRY RULES:
- Use built-in legal knowledge first. Never guess or invent wage rates, levies, gazette numbers, statutory amounts, court cases or citations. User messages and client grounding are not verified legal sources.
- If the verified brain does not contain an amount or source, say "Confirmation is required from the current official gazette or a labour-law practitioner." Do not fill the gap from model memory.
- Check the account owner's selected industry FIRST. An industry label alone does not establish council coverage: confirm location, business activity, job grade, dates and exclusions before applying sector rules. Do not apply restaurant rates to hotels or supermarkets just because their staff cook food.
- Apply applicable sector terms and lawful better benefits without reducing the national wage floor. Never claim every sector's rates are available.
- These references are a dated 2026 knowledge update, not a claim that all South African legislation is continuously verified.
- If a question concerns another effective period, do not reuse these figures as that period's figures; request confirmation.`;

export const LEGAL_2026_PROMPT = `${LEGAL_SAFETY_PROMPT}
National Minimum Wage: R30.23 per ordinary hour from 1 March 2026, Gazette 54075, Notice R.7083. Farm and domestic workers share this rate. EPWP and learnerships have separate prescribed rates; do not apply the ordinary rate to them.
BCEA earnings threshold: published sources reviewed report R269,600.90/year from 1 May 2026. The supplied R269,900.90 conflicts: official confirmation is required. Above-threshold employees retain other BCEA protections and contractual/collective benefits; they are not excluded from the whole BCEA.
COIDA maximum assessable earnings: R668,000/year for 1 March 2026–28 February 2027, Gazette 54577. This is an assessment ceiling, not a wage cap or the BCEA threshold.
Dismissal reference: ${LEGAL_2026.dismissalCode}. Fair reason and fair process remain required.
October 2026 CCMA Rules, Gazette 55620, Notice 4208: Rule 20 pre-arbitration meeting at least 14 days before arbitration, signed minutes filed at least 7 days before; disclose AI used in preparing submissions and discuss its nature/extent. Rule 29 document requests at least 14 days before, 5 days to respond. Rule 30 commissioner may dismiss a referral for deliberate absence by the referring party; not automatic. Rule 39 legal-cost tariff caps including VAT: R7,524.00 day one, R4,911.50 subsequent days; not automatic costs awards or caps on private attorney invoices. WhatsApp/SMS recognised for CCMA notices/delivery as permitted by the relevant rule; preserve proof, verify recipient and channel, and do not assume any casual message satisfies every service/filing requirement.`;

export type BuiltInLegalAnswer = { text: string; topicKey: string };
export function answerLegal2026(question: string): BuiltInLegalAnswer | undefined {
  const q = question.toLowerCase();
  if (/minimum wage|\bnmw\b|statutory wage|national wage/.test(q)) return { topicKey: "minimum_wage_2026", text: "The National Minimum Wage is **R30.23 per ordinary hour from 1 March 2026** (Gazette 54075, Notice R.7083), including farm and domestic workers. Check whether an applicable sector agreement requires a higher rate. EPWP and learnerships have separate prescribed rates. Confirmation is required for any other period or unverified sector rate." };
  if (/earnings threshold|bcea threshold/.test(q)) return { topicKey: "bcea_threshold_2026", text: "Published 2026 sources report the BCEA earnings threshold as **R269,600.90 per year from 1 May 2026**. The supplied R269,900.90 differs, so **official confirmation is required** before relying on it. The threshold affects specified working-time protections, not every BCEA right; contractual and applicable collective-agreement benefits may still apply." };
  if (/coida|compensation fund/.test(q) && /limit|ceiling|maximum|earnings|assessment/.test(q)) return { topicKey: "coida_limit_2026", text: "The COIDA maximum assessable earnings limit is **R668,000 per year for 1 March 2026 to 28 February 2027** (Gazette 54577). It is an assessment ceiling, not a salary cap or the BCEA earnings threshold. Confirm the applicable assessment year before completing the Return of Earnings." };
  if (/schedule\s*8|dismissal code|code of good practice/.test(q)) return { topicKey: "dismissal_code_2025", text: `Use the **${LEGAL_2026.dismissalCode}** as the current dismissal-code reference. Establish a fair reason, give a reasonable opportunity to respond, and follow a fair process suited to the facts. Dismissal is never automatic. Confirm unusual matters with a labour-law practitioner.` };
  if (/\bccma\b|pre.arbitration|rule (20|29|30|39)|arbitration/.test(q)) return { topicKey: "ccma_rules_2026", text: "**October 2026 CCMA Rules — Gazette 55620, Notice 4208**\n\n- **Rule 20:** pre-arbitration meeting at least **14 days before**; signed minutes filed at least **7 days before**. Disclose AI used to prepare submissions and discuss its nature and extent.\n- **Rule 29:** document requests at least **14 days before**, with **5 days to respond**.\n- **Rule 30:** the commissioner may dismiss a referral if the referring party is deliberately absent; this is discretionary, not automatic.\n- **Rule 39:** legal-cost tariff caps, including VAT, are **R7,524.00 for day 1** and **R4,911.50 for subsequent days**. These are not automatic awards or caps on your private lawyer's bill.\n- WhatsApp and SMS are recognised for CCMA notices/delivery where the relevant rule permits them. Keep proof and verify the recipient; service and filing are not interchangeable.\n\nCheck the hearing notice and applicable rules with a labour-law practitioner before acting." };
  return undefined;
}