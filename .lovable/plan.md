## Found it

`inrecoapp.inreco.co.za` is served by the GitHub repo **`badenhorstcasper-ops/inreco-app-landing`** (single static `index.html`, GitHub Pages). That is why publishing any Lovable project does nothing to this landing page — it is not a Lovable project at all.

There are **4 spots** mentioning "Free" in that `index.html`:

| Line | Current text | Purpose |
|---|---|---|
| 169 | `Get Started Free` | Hero CTA button |
| 267 | `Free` + tier card "Starter / R0 / 5 questions/month" + bullet "5 AI questions/month" | Pricing card |
| 275 | `Get Started Free` | Button inside the Free pricing card |
| 351 | `Free` mention (bottom CTA section) | Secondary CTA |

There are also supporting lines:
- `Start free. Scale as you grow.` (pricing heading)
- `5 free questions every month. Upgrade when you need more.` (pricing sub-copy)

## What to change

Since this app no longer offers a free tier, the cleanest fix is:

1. **Hero button** (line 169): `Get Started Free` → `Get Started`
2. **Remove the entire Free/Starter pricing card** (the `<div class="price-card">` block around lines 266–276 containing "Starter / R0").
3. **Update the pricing section heading + sub-copy** (~lines 261–263):
   - `Start free. Scale as you grow.` → `Plans that scale with you.`
   - `5 free questions every month. Upgrade when you need more.` → `Pick the plan that fits your team. Upgrade or downgrade any time.`
4. **Bottom CTA mention of "Free"** (line 351): rewrite to remove the word "Free".
5. Adjust the pricing grid so the remaining cards (Solo / next tiers) still lay out nicely — the existing `grid-template-columns:repeat(auto-fit,minmax(200px,1fr))` already handles this automatically, no CSS change needed.

## How the change ships

Since the repo is on **your GitHub**, not Lovable, the edit has to happen on GitHub. Two paths:

- **Option A — I give you the exact patch, you paste it in GitHub web editor.** Fastest. You open `https://github.com/badenhorstcasper-ops/inreco-app-landing/edit/main/index.html`, paste the replacement blocks, commit to `main`. GitHub Pages redeploys in ~1 minute and `inrecoapp.inreco.co.za` updates automatically.
- **Option B — You grant me access / paste the file here and I rewrite it for you.** I produce the full updated `index.html` and you commit it.

Either way, **no changes are made in this Lovable project** (which is `app.inreco.co.za`, a separate concern).

## Recommended

Go with Option A. Approve this plan and I will produce the exact diff (the 4 edits above) ready to paste into GitHub.
