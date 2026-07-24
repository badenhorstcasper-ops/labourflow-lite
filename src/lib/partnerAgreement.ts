// iNRECO Partner Agreement — versioned source of truth.
// Bump PARTNER_AGREEMENT_VERSION whenever the wording below changes; historical
// acceptance rows keep their own version stamp for legal proof.

export const PARTNER_AGREEMENT_VERSION = "v1.0";
export const PARTNER_AGREEMENT_EFFECTIVE_DATE = "2026-07-24";

export interface Clause {
  n: number;
  title: string;
  body: string;
}

export const PARTNER_AGREEMENT_CLAUSES: Clause[] = [
  {
    n: 1,
    title: "Independent contractor — NOT employment",
    body:
      "This is a commercial referral arrangement between two independent parties. It is expressly NOT a contract of employment, is not a fixed-term contract, is not a 'dependent contractor' arrangement, is not labour-broking or a temporary employment service, and does not create any reasonable expectation of employment now or in future. " +
      "The Partner is not entitled to any salary, wage, overtime, leave (annual, sick, family responsibility, maternity or paternity), UIF, COIDA cover, pension, provident fund, medical aid, 13th cheque, bonus, notice pay, severance pay or any other benefit that flows from an employment relationship. " +
      "Nothing in this agreement, in any communication, training material, marketing kit, WhatsApp / SMS / email message, meeting, or any other contact between the parties may be construed or relied upon as creating an employment relationship. The parties record that iNRECO exercises no control over the Partner's methods, hours, place of work, tools, dress, personal life or economic activities, that the Partner is not integrated into iNRECO's business, and that the Partner is not economically dependent on iNRECO."
  },
  {
    n: 2,
    title: "Voluntary participation",
    body:
      "Applying for and using a partner referral code is entirely voluntary. iNRECO does not prescribe any minimum hours, minimum sales, territory, quota, reporting line, uniform, working days, or method of work. The Partner is free to promote (or not promote) iNRECO whenever and wherever they choose, subject only to the marketing conduct rules in clause 6. This opportunity is offered as a way for interested individuals — including unemployed people or those looking to supplement existing income — to earn a recurring commission."
  },
  {
    n: 3,
    title: "Own tax & statutory obligations",
    body:
      "The Partner is solely responsible for their own SARS registration, income tax, provisional tax, VAT (if applicable), and any other statutory declarations or submissions arising from the commissions earned. iNRECO will NOT deduct PAYE, UIF or SDL from any commission, will NOT issue an IRP5, and does NOT withhold or contribute on the Partner's behalf. The Partner indemnifies iNRECO against any tax, penalty or interest claim arising from the Partner's own non-compliance."
  },
  {
    n: 4,
    title: "Commission — the only money payable",
    body:
      "The only remuneration payable to the Partner is the referral commission per the published rate card: Solo R50, Business R90, Professional R250 and Enterprise R900 per active, paid subscriber per calendar month, for as long as the subscriber remains actively paying. Commission is paid by EFT into the Partner's nominated bank account within three (3) South African business days of month-end. " +
      "Commission is earned only on subscribers who complete a paid subscription via the Partner's unique referral code. No commission is earned on trial-only signups that do not convert, on refunded payments, on chargebacks, or on subscriptions where the subscriber later disputes the transaction. There is no clawback on a subscriber's later cancellation — commission already correctly earned stays earned. " +
      "iNRECO may amend the rate card on 30 (thirty) days' written notice; changes are not retrospective."
  },
  {
    n: 5,
    title: "What the Partner may access",
    body:
      "Through the Partner Portal the Partner may access only: (a) their own commission payouts and statement; (b) a POPIA-minimised summary of subscribers under their referral code (first name plus the last four characters of the subscriber's email address, no other personal information); and (c) approved marketing materials. The Partner has no access to subscriber personal information, banking data, contact details, generated documents, or any part of the iNRECO app content."
  },
  {
    n: 6,
    title: "Marketing conduct — protecting the brand",
    body:
      "The Partner MUST NOT: make any false, misleading, exaggerated, or unverifiable claim about iNRECO, its features, prices, guarantees, endorsements or its owner; imply that they are an employee, agent, spokesperson, franchisee or official representative of iNRECO; use the iNRECO name, logo or trademarks except exactly as supplied in the approved marketing kit; run paid advertising of any kind (including Google Ads, Facebook / Instagram / TikTok / LinkedIn ads, YouTube ads, print ads, radio, outdoor), any SEO service, or any bulk email, SMS or WhatsApp broadcast campaign, without FIRST obtaining written approval from info@inreco.co.za; contact existing or former iNRECO customers directly; engage in spam, cold-calling that breaches the Consumer Protection Act or POPIA direct-marketing rules; or engage in any unlawful, discriminatory, hateful or defamatory conduct. " +
      "Any self-created advert, image, video, article or social post that mentions iNRECO must be emailed to info@inreco.co.za for written approval BEFORE use. Any breach of this clause results in immediate termination of the referral code, forfeiture of any unpaid commission earned through the breach, and possible legal action to recover damages to the iNRECO brand."
  },
  {
    n: 7,
    title: "Confidentiality & POPIA",
    body:
      "The Partner will keep confidential any non-public information about iNRECO, its subscribers, pricing, roadmap, or technical setup that they come across. The Partner will not process personal information of any subscriber except as strictly permitted in clause 5, and will comply with the Protection of Personal Information Act, 2013 in respect of any personal information they collect while promoting iNRECO (for example on their own contact form or spreadsheet)."
  },
  {
    n: 8,
    title: "Termination",
    body:
      "Either party may end this arrangement at any time on ONE (1) CALENDAR MONTH's written notice. Email to info@inreco.co.za from the Partner, or from info@inreco.co.za to the Partner's registered email, is sufficient written notice. " +
      "iNRECO may terminate this arrangement IMMEDIATELY, without notice, in the event of any breach of clauses 6 or 7, any unlawful conduct, reputational harm, or fraud. On termination the referral code stops working, but commission validly earned before the termination date will still be paid on the next scheduled monthly payout."
  },
  {
    n: 9,
    title: "No exclusivity",
    body:
      "The Partner may freely promote any other product or service, provided it is not a competitor to iNRECO and does not confuse the market. iNRECO may appoint any number of other partners on the same or different terms."
  },
  {
    n: 10,
    title: "Governing law and forum",
    body:
      "This agreement is governed by the laws of the Republic of South Africa. Any dispute will be referred to the Magistrates' Court having jurisdiction (or the High Court of South Africa if the amount exceeds the Magistrates' Court's jurisdiction). The parties expressly record that because there is no employment relationship, the Commission for Conciliation, Mediation and Arbitration (CCMA), any bargaining council, and the Labour Court have NO jurisdiction over any dispute between the parties."
  },
  {
    n: 11,
    title: "Whole agreement and variation",
    body:
      "This document, together with the current published rate card, is the whole agreement between the parties. It replaces any prior discussion or representation. No variation is valid unless recorded in writing (email accepted) and signed / confirmed by both parties. The current version and effective date are displayed on the iNRECO website. Continued use of the referral code after a new version is published constitutes acceptance of that version."
  },
];

export const CLAUSE_ACCEPTANCE_LABELS = {
  agreement: `I have read and accept the iNRECO Partner Agreement (${PARTNER_AGREEMENT_VERSION}).`,
  notEmployment:
    "I understand this is a commission-only referral arrangement and is NOT employment — I will not claim UIF, leave, salary, notice pay, severance or any other employment benefit from iNRECO, now or in future.",
  taxAndAds:
    "I understand I am responsible for my own SARS and tax affairs, and that I must get written approval from info@inreco.co.za before running any self-created advert that mentions iNRECO.",
} as const;
