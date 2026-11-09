// Pure matching rules. An identical copy lives in src/lib/industryMatch.ts — keep both the same.
export type IndustryKey = "restaurant" | "retail" | "other";

const RESTAURANT_WORDS = [
  "restaurant", "restuarant", "fast food", "fastfood", "takeaway", "take-away", "take away",
  "catering", "caterer", "coffee shop", "cafe", "café", "tearoom", "pub", "tavern", "shebeen",
  "roadhouse", "snack bar", "pizzeria", "pizza", "bakery", "waiter", "waitress", "waitron",
  "wine steward", "bartender", "barman", "chef", "sous chef", "cook", "kitchen", "scullery",
  "dishwasher", "head waiter", "commission worker", "bcffrcat", "bargaining council for the fast food",
  "hospitality", "franchise", "drive-thru", "drive thru",
];

/** Should the restaurant agreement be given to CARA for this question? */
export function needsRestaurantPack(industry: string | null | undefined, question: string): boolean {
  if (industry === "restaurant") return true;
  const q = ` ${question.toLowerCase()} `;
  return RESTAURANT_WORDS.some((w) => {
    if (w.length <= 4) return new RegExp(`\\b${w}\\b`).test(q); // "pub", "cafe", "cook"
    return q.includes(w);
  });
}

