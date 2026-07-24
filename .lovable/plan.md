## Updated plan

You are right: you gave me the PayFast details, and I should not ask you for them again unless PayFast still rejects them.

I checked the working app you named. Its PayFast flow is safer than this app’s current flow: it does **not** let the pricing page build the whole PayFast form by itself. It first asks the app’s backend to prepare the PayFast handover, including the PayFast signature. I will copy that approach into this app.

## What I will build

1. **Create a proper PayFast trial-start step**
   - The pricing page will send the chosen plan and email address to the app backend first.
   - The backend will prepare the PayFast handover using the same live PayFast account:
     - Merchant ID: `12090292`
     - Merchant Key: `3xbkln8wrhwq`
     - Live mode
     - Existing PayFast passphrase already saved in the app
   - The backend will add the PayFast signature before sending the user to PayFast.

2. **Make PayFast collect card/bank details for the free trial**
   - The PayFast handover will be a recurring subscription setup, not a once-off payment.
   - It will send:
     - `amount = 0.00` so there is no charge today
     - `subscription_type = 1` so PayFast collects card/account details
     - `billing_date = today + 7 days`
     - `recurring_amount = the selected plan price`
     - `frequency = monthly`
     - `cycles = 0` so it keeps running until cancelled
   - This is what allows the first debit to happen automatically after the 7-day free trial if the user does not cancel.

3. **Create the trial record before sending the user away**
   - When someone enters an email and clicks “Start 7-day free trial”, the app will create a pending trial record first.
   - That means the app already knows which email and plan the PayFast checkout belongs to.
   - When PayFast confirms the setup, the app will update that same record to trialing.

4. **Fix the account-linking gap**
   - After PayFast success, if the user creates an account with the same email, the app will link that account to the pending/trial subscription.
   - This avoids losing users when PayFast confirms slightly before or after account creation.

5. **Keep cancellation working**
   - The PayFast confirmation should store the PayFast subscription token.
   - The cancel button under Account Settings will use that token to stop future PayFast debits.
   - If cancellation happens during the free trial, no first debit should happen.

6. **Fix both entry points**
   - Main landing page pricing buttons will still go to `/pricing`.
   - `/pricing` will be the one clean place where users enter their email and start the free trial.
   - Any old in-app PayFast checkout code will be aligned so it does not use sandbox or a different setup.

7. **Check app install/download flow**
   - Confirm the install button and home-screen shortcut use the iNRECO name and logo.
   - Confirm the shortcut opens the app/sign-in flow, not a dead or confusing page.

## Testing I will do before calling it fixed

- Test `/pricing` with a new email address.
- Test Solo, Business and Professional trial buttons.
- Confirm the app sends PayFast a signed recurring subscription setup.
- Confirm the first debit date is exactly 7 days ahead.
- Confirm PayFast is asked to collect card/account details for the recurring subscription.
- Confirm PayFast no longer opens the “merchant key must be 13 characters” error.
- Confirm PayFast success leads the user to account creation/opening the app.
- Confirm a newly created account gets linked to the trial.
- Confirm cancelled trial users lose access and future debits are stopped.

## Important guardrail

If PayFast still rejects the exact merchant key you gave after this backend handover is in place, I will stop and show you the clear reason. I will not let visitors keep landing on a PayFast error page.