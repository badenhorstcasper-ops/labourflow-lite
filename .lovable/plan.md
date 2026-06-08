## What's going on

The landing page at `inrecoapp.inreco.co.za` is **not served by this project**. This project (`basic-task-sparkle` / `app.inreco.co.za`) was already updated and no longer says "Free".

`inrecoapp.inreco.co.za` is served by a different Lovable project in your workspace: **iNRECO HR Hub** (`inreco-co-za.lovable.app`). That project still contains "Get Started Free" in two components:

- `src/components/landing/ExitIntentModal.tsx` — line 41
- `src/components/landing/MobileStickyCTA.tsx` — line 25

That is why publishing this project makes no difference to that domain.

## How to fix

You have two options — pick one and I'll do it:

1. **Open the iNRECO HR Hub project and remove "Free" there.**
   I can switch over (or you open it) and edit those two files to change "Get Started Free" → "Get Started", then publish that project. This is the correct fix if `inrecoapp.inreco.co.za` is meant to keep being its own landing page.

2. **Repoint `inrecoapp.inreco.co.za` to this project instead.**
   If you want this project's landing page to be the one users see, the fix is not code — it's moving the `inrecoapp.inreco.co.za` custom domain off the *iNRECO HR Hub* project and connecting it to *this* project in Project Settings → Domains. Then both `app.inreco.co.za` and `inrecoapp.inreco.co.za` would serve the same updated landing.

## Recommended

Option 1 is the smaller, safer change and matches what you've already asked for ("remove Free from the button"). Tell me to go ahead and I'll make the edit in the **iNRECO HR Hub** project and have you publish it.
