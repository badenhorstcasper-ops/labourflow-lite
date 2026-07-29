## Goal

Give you real, evidence-based confidence that a brand-new person who signs up today — on a free trial or paying — can do everything the app promises, end to end, on the **live** site (not just the preview).

Nothing below changes how the app behaves for your customers. It is a test-and-fix sweep: I test as a real user, and only fix what actually breaks.

## How I'll test

I'll walk through the app the way a new customer does, using a throwaway test account, and record what happened at each step (with screenshots). Anything that fails gets fixed and re-tested before I report back.

### 1. Brand-new free-trial customer
- Land on the home page → click "Start 7-day free trial" → create an account with a fresh email
- Confirm the trial actually starts, the trial end date is correct (7 days), and the app opens
- Set up the company profile (name, details, logo upload) and confirm it saves
- Create a document (both the guided way and the blank fill-in way), download the PDF and Word file, open the share link in a logged-out browser, revoke it, delete it
- Try the Verify Sick Note module and the Book a Chairperson request
- Ask CARA a question, including the voice/microphone input
- Check the Dashboard shows correct numbers
- Try to add a team member on Solo (should be politely blocked) and sign in on a second device (2 allowed, third blocked with a clear message)

### 2. Paying customer
- Go through checkout on the live payment page for each plan tier
- Confirm the receipt shows "iNRECO Pocket Consultant" and the correct price (Solo / Business R599 / Professional / Enterprise)
- Confirm the account is upgraded automatically after payment, with no manual step from you
- Confirm the correct seat and device limits apply per tier, and that team invites work on the bigger plans (invite → email link → accepted → the invited person can use the app)
- Test the "cancel payment" path and confirm the person lands somewhere sensible with no loop

### 3. What happens when the trial ends
- Check what a customer sees on day 8 if they never paid, and that they can pay from inside the app to continue
- Confirm nobody is charged during the free trial

### 4. Partner / referral side
- New partner application → your approval link → partner gets their number and demo access → a signup using their referral code is correctly linked to them and shows up in your commission figures

### 5. Your owner/admin views
- Confirm every admin page loads with live, correct numbers, and that the Live App Health page shows all backend services green on the **live** site (this is what caught the missing services last time)

### 6. Live-vs-preview parity
- Re-run the health check against app.inreco.co.za itself, so nothing is "working in preview but missing live"

## What you'll get

A single plain-English report, grouped as:
- **Works** — tested and confirmed, with what I did
- **Fixed** — was broken, what was wrong, what I changed, re-tested
- **Needs you** — anything only you can do (e.g. approving a real card payment, or a setting on the payment provider side)

## Notes and limits

- Real payments: to test the paid path properly I need at least one genuine low-value transaction (or your permission to use a small real amount and refund it). Tell me which you prefer and I'll work around it.
- Email delivery (sign-up confirmations, invites, password resets) can only be fully confirmed by seeing the mail arrive — I'll check the sending records on our side and flag anything that didn't leave the building.
- I'll use throwaway test accounts and clean up any test data I create so your real numbers stay accurate.

## Technical detail

Automated browser runs (Playwright) against both the local build and the live domain, with console/network capture; direct database checks on subscription rows, trial end dates, device and seat limits, referral attribution; invocation logs for all 21 backend functions in the live environment; and a re-run of the live health sweep. Fixes stay scoped to whatever the tests actually catch.
