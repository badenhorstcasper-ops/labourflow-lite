## What I checked

I compared this app with the working [GitHub Import Hub](/projects/13a3eb04-dd03-407e-b002-110d316820c1) PayFast setup.

The working app does three important things differently:

1. It creates a pending payment record before sending the customer to PayFast.
2. It sends PayFast a smaller, cleaner payment form.
3. It signs the PayFast form using stricter formatting: values are trimmed, spaces are handled exactly the PayFast way, and the passphrase is trimmed before signing.

Your current app is still sending customers to PayFast, but the latest error screenshot means PayFast is rejecting the form before checkout can start because the signature does not match. That fits the difference above.

I also checked the live payment records in this app: there is a recent pending Professional trial for `duvenhage.marcell@gmail.com`, but no PayFast confirmation has come back for it. That means the user reached the broken PayFast step, but PayFast did not accept the checkout.

## Fix plan

### 1. Copy the proven PayFast signing method

Update this app’s PayFast checkout helper so it signs the form the same way as the working project:

- trim the PayFast passphrase before using it
- trim each value before signing
- use PayFast-style encoding exactly like the working app
- keep the field order stable
- remove anything from the signature that PayFast should not receive

### 2. Make the PayFast form simpler and safer

Change the checkout handover to match the working pattern more closely:

- create one unique payment number first
- store the selected plan, email, amount, and status before redirecting
- send PayFast only the required payment fields
- keep plan/user details in our own payment record instead of overloading PayFast fields

### 3. Add a proper payment tracking table

Add a small backend table for PayFast attempts, like the working app uses.

It will store:

- payment number
- email
- user if already signed in
- selected plan
- amount
- PayFast payment number once received
- PayFast subscription token once received
- payment status

This gives us a clear trail when someone clicks a free trial button, instead of guessing from incomplete subscription rows.

### 4. Update the PayFast callback to use the payment record

Change the PayFast confirmation handler so it:

- finds the stored payment record using the payment number
- confirms the plan and amount
- marks the payment complete when PayFast confirms it
- activates the 7-day trial
- saves the PayFast subscription token for later cancellation

### 5. Improve the success page

After PayFast returns the customer to the app:

- show a clear “confirming your trial” screen
- check the stored payment record for up to about 30 seconds
- if PayFast is slow, tell the user their access will activate automatically
- if they are not signed in yet, guide them to create the account using the same email

### 6. Re-publish the PayFast helpers and test the flow

After the code and backend change are approved, I will:

- publish the checkout helper
- publish the PayFast confirmation helper
- test the live pricing page up to the PayFast handover
- confirm the PayFast form no longer produces the signature error
- confirm the app records the payment attempt before PayFast opens

## Important note

I will not change prices, plan names, trial length, or app access rules. This is only to replace the broken PayFast handover with the working pattern from your other project.