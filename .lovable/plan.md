
# Approved plan — final fixes to ship

You chose **Option B** for the Solo tier: remove the "50 questions/month" wording instead of building a counter. Here's exactly what I will do.

## 1. Fix the "Open CARA" button after payment
On the payment-success page, the button currently takes users back to the marketing homepage. I'll point it at the CARA hub instead so paid users land straight in the app.

## 2. Let your admin accounts into the app without a subscription
Right now the subscription gate blocks anyone without a paid plan. Your two admin emails (badenhorst.casper@gmail.com and casperbadenhorst77@outlook.com) never paid, so they'd be bounced to the pricing page. I'll teach the gate to always let admins through.

## 3. Add a "Billing" link in the top nav
Paid users have no way to find the cancel button today. I'll add a **Billing** link in the app header that opens the Settings page, where the "Cancel subscription" button already lives.

## 4. Make the cancel-subscription button reliable on live
The cancel function uses a slightly wrong way of checking who's logged in, which can fail on live. I'll switch it to the same method the other functions already use.

## 5. Clean up Solo tier wording (your choice — Option B)
- On the pricing page and the older in-page pricing modal, replace the "50 AI questions/month" bullet with "CARA AI adviser" so we don't promise a limit we don't enforce.
- Business, Professional and Enterprise wording stays the same.

## 6. Show WhatsApp support only to Professional & Enterprise
We advertise "WhatsApp support" on those two tiers but nothing shows up inside the app. I'll add a green **WhatsApp your consultant** button on the Dashboard that only appears when the user is on Professional or Enterprise (using 084 402 7029).

## 7. Landing page header "Get Started" button
Currently opens the old built-in signup pop-up. I'll change it to go straight to `/pricing` so every entry point uses the same PayFast flow. All the other "Start 7-day free trial" buttons on the landing page already do this correctly — no change there.

## What's already correct (leaving alone)
- PayFast trial signup (R0 today, first debit day 7) on every paid tier.
- Trial expiry blocks the owner and all invited team members immediately.
- Failed first debit marks the account past due and blocks access.
- Seat limits per tier (1 / 5 / 10 / 15).
- Terms, Privacy, Disclaimer links in footer.
- Enterprise "Contact Us" button routes to the contact form (no PayFast).

Please click **Approve** and I'll make all seven changes in one go.
