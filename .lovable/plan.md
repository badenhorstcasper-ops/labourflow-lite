## 1. Feature the Sick Note Verifier on the landing page

The landing page in this project is `index.html` (served at the marketing URL). I'll add a new "Verify Sick Notes" section between the existing feature area and the pricing block. It will include:

- A short punchy headline: "Fake sick notes? Verify them in minutes."
- 2–3 sentences of plain-language copy explaining that iNRECO walks you through checking the certificate against the HPCSA, PCNS and AHPCSA registers, classifies the result as Verified / Inconclusive / Discrepancy, and — if fraud is suspected — auto-drafts a charge sheet and procedural fairness checklist.
- A bullet list of the selling points (guided verification, POPIA-safe private storage, locked audit trail for CCMA, ready-to-use charge sheet).
- A "Try it inside iNRECO" button linking to `/pricing` (same styling as existing CTAs).

Same visual language as the rest of the page (iNRECO blue, existing card/section classes) so no design retheming.

Note: the separate `inrecoapp.inreco.co.za` landing repo (`badenhorstcasper-ops/inreco-app-landing`) is not part of this project — I'll write the section here, and you can either copy the block across or ask me in that repo to mirror it.

## 2. Raise Business tier from R499 to R599

Update every place the R499 price appears so PayFast, the pricing page, and the checkout all agree:

- `src/pages/Pricing.tsx` — change the Business plan `amount` from `499` to `599` and `priceLabel` from `"R499"` to `"R599"`.
- `supabase/functions/payfast-checkout/index.ts` — change `PLAN_PRICES.Business` from `499` to `599` so the recurring PayFast debit is signed at the new amount.
- `index.html` — update any Business price mention in the landing/pricing copy from R499 to R599.

Existing customers already on a signed PayFast subscription at R499 will keep debiting at R499 (PayFast recurring amounts are locked when the token is created). Only new sign-ups from the moment of deploy pay R599. If you want existing R499 subscribers moved to R599, that's a manual cancel-and-re-sign in PayFast — say the word and I'll add a short admin note in the plan.

## 3. What I will not change

- No changes to Solo (R259), Professional (R1,499) or Enterprise (R3,999).
- No changes to the verifier module itself — this is landing-page marketing only.
- No changes to the separate landing repo (out of scope for this project).

## Technical detail

Files touched:
- `index.html` (add feature section + update Business price mention if present)
- `src/pages/Pricing.tsx` (Business amount + label)
- `supabase/functions/payfast-checkout/index.ts` (`PLAN_PRICES.Business = 599`)

The edge function change triggers an auto-redeploy. No database migration, no new secrets, no auth changes.
