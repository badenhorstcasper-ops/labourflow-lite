// Pure matching rules. An identical copy lives in src/lib/industryMatch.ts — keep both the same.
export const INDUSTRIES = [
  { value: "restaurant", label: "Restaurant & Fast Food" },
  { value: "retail", label: "Retail & Supermarket" },
  { value: "security", label: "Private Security" },
  { value: "cleaning", label: "Contract Cleaning" },
  { value: "domestic", label: "Domestic Work" },
  { value: "hospitality", label: "Hospitality" },
  { value: "agriculture", label: "Agriculture & Farming" },
  { value: "wholesale", label: "Wholesale & Distribution" },
  { value: "transport", label: "Transport & Logistics" },
  { value: "other", label: "Other" },
] as const;
export type IndustryKey = typeof INDUSTRIES[number]["value"];
export function industryContext(industry: string | null | undefined): string {
  const selected = INDUSTRIES.find((item) => item.value === industry);
  if (!selected || selected.value === "other") return "Confirm the business activity and location before applying sector rules.";
  return `Selected company industry: ${selected.label}. Check this profile first. Confirm sector/council coverage, location, job grade and effective period. Only the restaurant agreement is currently loaded as a full sector pack; other sector rates and levies require confirmation. Hospitality is not automatically restaurant-council coverage; supermarkets are excluded from that restaurant pack.`;
}

/** Rate-table requests only; salary deductions and other pay disputes are not rate lookups. */
export function isSectorRateQuestion(question: string): boolean {
  if (/deduct|recover|fine|withhold|unpaid|dispute|late pay|equal pay|discriminat/i.test(question)) return false;
  return /(?:wage|salary|pay|sector|council).{0,30}rates?|rates?.{0,30}(?:wage|salary|pay|sector|council)|minimum (?:hourly )?(?:wage|salary|pay)|levy|levies|what (?:must|should|do) i pay|how much.{0,30}(?:pay|earn)/i.test(question);
}

export function sectorConfirmation(industry: string | null | undefined, question: string): string | undefined {
  if (!isSectorRateQuestion(question) || needsRestaurantPack(industry, question)) return undefined;
  const selected = INDUSTRIES.find((item) => item.value === industry);
  if (!selected || selected.value === "other") return undefined;
  return `Your company profile selects **${selected.label}**. Confirmation is required for the applicable sector wage or levy: first establish the business activity, location, job grade and effective period. The general National Minimum Wage is R30.23 per ordinary hour from 1 March 2026 (Gazette 54075); applicable higher sector rates must also be honoured. ${selected.value === "restaurant" ? "The restaurant agreement is available for a detailed check, but its geographic and business exclusions must be confirmed before quoting a rate." : "A verified wage/levy table for this sector is not yet loaded, so I will not invent one."}`;
}

const RESTAURANT_WORDS = [
  "restaurant", "restuarant", "fast food", "fastfood", "takeaway", "take-away", "take away",
  "catering", "caterer", "coffee shop", "cafe", "café", "tearoom", "pub", "tavern", "shebeen",
  "roadhouse", "snack bar", "pizzeria", "pizza", "bakery", "waiter", "waitress", "waitron",
  "wine steward", "bartender", "barman", "chef", "sous chef", "cook", "kitchen", "scullery",
  "dishwasher", "head waiter", "commission worker", "bcffrcat", "bargaining council for the fast food",
  "franchise", "drive-thru", "drive thru",
];

/** Should the restaurant agreement be given to CARA for this question? */
export function needsRestaurantPack(industry: string | null | undefined, question: string): boolean {
  if (industry === "restaurant") return true;
  if (industry && industry !== "other") return false;
  const q = ` ${question.toLowerCase()} `;
  return RESTAURANT_WORDS.some((w) => {
    if (w.length <= 4) return new RegExp(`\\b${w}\\b`).test(q); // "pub", "cafe", "cook"
    return q.includes(w);
  });
}

