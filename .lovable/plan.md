## Plan

Three sequential steps. After each, I'll confirm before moving to the next.

### 1. Verify routing on app.inreco.co.za

Open the live site in the browser and visit each route:
- `/pricing` → Pricing page
- `/settings` → Settings page (logged in)
- `/payment-success` → success message
- `/payment-cancelled` → cancelled message

Confirm each renders its own component (not the dashboard placeholder). Capture screenshots. If any route still falls through, debug the SPA fallback / `Index.tsx` router.

### 2. Build out the real CARA Dashboard

Currently `src/pages/Dashboard.tsx` is just a placeholder image + nav. Before I write anything, I need from you:

- **What is "CARA"?** What does the dashboard actually need to show? (e.g. list of cases, document generator, chat, file uploads, analytics…)
- **Is there an existing design reference** (Figma, screenshot, previous version) I should match?
- **What data sources?** Which Supabase tables back the dashboard? (only `subscriptions` and `team_members` exist right now)
- **Auth gate:** should unauthenticated users see a login screen, or a marketing landing page with a "Sign in" button?

I'll ask these as a follow-up question set once you approve this plan.

### 3. Wire up PayFast checkout on Pricing

On each plan's "Subscribe" button in `src/pages/Pricing.tsx`, build and POST a PayFast form to `https://www.payfast.co.za/eng/process` (sandbox vs live TBD) with:

```
merchant_id      = 12090292
merchant_key     = 3xbkln8wrhwq
return_url       = https://app.inreco.co.za/payment-success
cancel_url       = https://app.inreco.co.za/payment-cancelled
notify_url       = https://ckjevliuwlijfvdjxmmp.supabase.co/functions/v1/payfast-webhook
subscription_type= 1
frequency        = 3        (monthly)
cycles           = 0        (indefinite)
amount / recurring_amount = 259 | 499 | 1499 | 3999
item_name        = "iNRECO <Plan> Subscription"
custom_str1      = <auth user id>
custom_str2      = <plan name>   ← matches payfast-webhook expectations
m_payment_id     = `${userId}|${plan}|${Date.now()}`
```

The form auto-submits via a hidden `<form method="POST">` on button click. Requires the user to be logged in (redirect to auth otherwise).

Questions before building:
- **Live or sandbox?** Use `www.payfast.co.za` (live) or `sandbox.payfast.co.za` (test)?
- **Signature:** Do you have the PayFast **passphrase** set in the PayFast dashboard? If yes, we need to compute an MD5 `signature` field — that must happen in an edge function (passphrase is a secret), not the browser. If no passphrase is configured, we can post directly from the client.

### Technical notes

- `payfast-webhook` edge function already reads `custom_str1` (user id) and `custom_str2` (plan), so the client form must set those.
- The webhook's `notify_url` host in the spec is `ckjevliuwlijfvdjxmmp.supabase.co` but the project's actual Supabase ref is `riqswihuzclbyjemynyd`. I'll flag this — need to confirm which project the webhook is deployed in.

### Order of execution

1. Verify routes (fast, browser only).
2. Ask the dashboard discovery questions, then build.
3. Ask the PayFast live/sandbox + passphrase questions, then wire it.
