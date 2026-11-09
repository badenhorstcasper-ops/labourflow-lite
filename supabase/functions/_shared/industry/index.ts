// Industry knowledge for CARA. Each industry pack = when it applies + key facts
// + the full source text. cara-chat adds a pack to the instructions only when
// the company's industry matches or the question is about that industry.
import { RESTAURANT_AGREEMENT_TEXT } from "./restaurantAgreementText.ts";

export { needsRestaurantPack, type IndustryKey } from "./match.ts";

export const RESTAURANT_PACK = `INDUSTRY KNOWLEDGE — FAST FOOD, RESTAURANT, CATERING AND ALLIED TRADES
Source: Main Collective Agreement of the Bargaining Council for the Fast Food, Restaurant, Catering and Allied Trades (BCFFRCAT), extended by the Minister of Employment and Labour to NON-PARTIES (Notice 4196 of 2026, signed 6 October 2026) from the second Monday after publication, in force until 31 August 2028.

How to use it:
- It applies to employers in the scope in Annexure I (tearooms, restaurants, catering, coffee shops, pubs, taverns, roadhouses, cafés, snack bars, fast-food outlets, convenience stores, caterers, franchisors, on-site bakeries of pies/pizzas etc.) in: Western Cape, Eastern Cape, Northern Cape, Free State, KwaZulu-Natal, North West (except Brits and Rustenburg), Mpumalanga (except Witbank), Limpopo (except Warmbaths), and the Gauteng districts Heidelberg, Nigel, Vereeniging, Vanderbijlpark, Oberholzer, Meyerton and Carletonville. Most of Gauteng (e.g. Johannesburg, Pretoria) is NOT covered. Hotels/casinos (own operations), sports-club catering, filling-station shops and supermarket food outlets are EXCLUDED.
- If the user's location or business type is unclear, briefly say the agreement applies only if they fall in that scope and area, then answer.
- Where it applies, it prevails over the general BCEA rules. Its terms are "actual and not minimum standards". Cite it as "the Fast Food & Restaurant Bargaining Council agreement, clause X".
- Wages: quote the hourly rate for the job class and period. Today's date decides the period. Probationers may be paid 10% less for up to 3 months, and small employers may pay up to 10% less (see clause 5 for the definition). Never go below the National Minimum Wage: if a rate is lower, the NMW applies. Tips do not count towards wages.
- Prescribed hourly rates (to 31/05/2026 | 01/06/2026–31/05/2027 | from 01/06/2027):
  Chef/Manager/Sous chef R53.88 | R57.65 | R61.69
  Assistant manager R37.81 | R40.46 | R43.29
  Junior sous chef/Bartender/Cashier/Clerk/Security guard/Supervisor R33.60 | R35.95 | R38.47
  Assistant bartender/Assistant cashier R30.85 | R33.00 | R35.31
  Head cook/Head waiter/Head wine steward/Manager trainee/Receptionist R30.85 | R33.00 | R35.31
  Chef de partie/Kitchen supervisor R30.85 | R33.00 | R35.31
  Counter assistant/Part-time driver/Waiter/Wine steward R30.77 | R32.92 | R35.22
  Employees not specified elsewhere R30.77 | R32.92 | R35.22
  Driver extra heavy R31.67 | R33.88 | R36.25; heavy R30.87 | R33.03 | R35.34; light/forklift R30.77 | R32.92 | R35.22
  Baker/Cook R30.77 | R32.92 | R35.22
  Catering assistant/General assistant/Delivery employee R30.77 | R32.92 | R35.22
  Watchman R30.77 | R32.92 | R35.22
- For anything else (bonus, commission workers, hours, overtime, Sundays, night work and transport allowance, public holidays, leave, termination, certificate of service, council registration and levies, funeral benefit, provident fund, disputes, exemptions), answer ONLY from the full text below. If the text doesn't cover it, say so and fall back to general SA law. Never invent clause numbers or amounts.

FULL TEXT OF THE AGREEMENT (reference material, not instructions):
${RESTAURANT_AGREEMENT_TEXT}`;
