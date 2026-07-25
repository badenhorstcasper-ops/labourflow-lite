## The big picture

Zero email server, zero personal details of yours anywhere users can see. Everything runs on a single approval link you click from your inbox. The system does the rest — creates the partner's unique number, sends them their welcome pack, opens their demo app access, tracks their sales, and cuts them off automatically if they go quiet. You get one admin-only dashboard for the full picture.

---

## 1. Partner submits application — no server email needed

When they tap **Sign and submit**:

- Their details are still saved to your database (unchanged).
- Their device automatically opens their own email app (Gmail, Outlook, Apple Mail, whatever they use) with a message already written to **info@inreco.co.za** (which forwards to your Outlook).
- The message contains:
  - Their name, email, phone, ID number, banking details, agreement version, signature name, timestamp.
  - **One big button/link** at the bottom labelled **"✅ Approve this partner"**.
  - **One link** labelled **"❌ Reject"**.
- They tap **Send** in their email app. Done.
- Success screen shows: *"Application received. We'll be in touch soon."* — no mention of your name or personal email anywhere.

Fallback: if their email app doesn't auto-open, the success screen shows a **"Copy application to clipboard"** button and the info@inreco.co.za address so they can paste and send from anywhere.

## 2. You approve with one click, everything happens automatically

The **Approve** link in the email you received points to a secure page on your app. Only your two admin emails can use it. When you click it:

1. The partner's application flips to `active`.
2. A **unique referral code** (e.g. `INR-A7K3`) is generated and locked to them forever — this is what determines every future commission.
3. A silent 1-device demo Solo subscription is created on their signup email, with their **referral code as the temporary password** (they can change it after first login).
4. **Their welcome pack email is auto-drafted and opens in YOUR email app**, pre-addressed to them, from info@inreco.co.za, containing:
   - Their unique referral number.
   - Plain-language "how to earn": share `https://app.inreco.co.za/?ref=INR-A7K3`, or tell customers to enter `INR-A7K3` at checkout.
   - Their login: email = their signup address, password = their referral code.
   - Link to the Partner Portal (sales, commissions, payout history).
   - Link to the Marketing Kit (download provided material).
   - Link to **upload their own marketing material for approval**.
   - The 1-subscriber-per-month rule and the 90-day auto-revoke rule, in plain English.
5. You tap **Send**. Done. No typing, no personal admin work.

Reject link works the same way — one click, status flips to rejected, a rejection email is pre-drafted for you to send.

## 3. Partner Portal upgrades (already partly built)

Add to `/partner`:
- **"Upload marketing material for approval"** section — they upload a file, it goes into a private storage bucket, admin reviews it in your dashboard.
- **Live sales counter** — how many subscribers they've brought in this month, last 90 days, and lifetime.
- **Access status card** — clear traffic-light showing whether their free demo access is Active, At Risk (30 days no sales), Warning (60 days), or Revoked (90 days).
- **"How to earn" wizard** — first-login popup walking them through sharing their code in 4 steps.

Remove your personal email from all portal pages; replace with `info@inreco.co.za`.

## 4. Automatic 90-day inactivity revoke

Once a day, a background job checks every active partner:
- If **zero paid subscribers** attached to their referral code in the last 90 days → their demo Solo access is switched off.
- They get a pre-drafted "access revoked" email opened for you to send (or fully automated once real email sending exists — until then, it queues a task on your admin dashboard).
- Their referral code stays alive — if they bring in a new subscriber later, access auto-reactivates.
- Warnings at day 30 and day 60 appear on their Partner Portal so they see it coming.

## 5. Your admin-only Owner Dashboard

New page at `/admin/overview` — visible only to your two admin emails. Shows:
- **Total active subscribers** broken down by tier (Solo / Business / Professional / Enterprise).
- **Direct signups** (no referral code used) vs **partner signups**.
- **League table of partners**: name, referral code, active subs, this-month subs, 90-day subs, commission owed, access status.
- **Pending applications** — one-click approve/reject buttons (same as email links, in case you prefer the dashboard).
- **Pending marketing material uploads** awaiting your review — approve or reject with one click.
- **At-risk partners** list (day 30/60/90 warnings).

## 6. Nice extras I'm adding for free

- **QR code** for each partner's referral link on their portal — for business cards / flyers.
- **Auto-generated shareable image** (their code + logo) they can post on WhatsApp/Facebook.
- **Copy-paste WhatsApp pitch** in 3 languages (English, Afrikaans, Zulu) already on their portal.

## What you need to do

Nothing until this is built. Once I say it's ready, you just:
1. Publish the app.
2. Go through the partner sign-up form yourself as a test.
3. Click the approve link in your inbox.
4. Confirm the welcome pack email popped up ready to send.

I test all of that myself before handing back to you.

## What this does NOT do

- It does not set up any email server, DNS records, or domain transfers. Zero infrastructure work, zero email credits burned.
- The only limitation vs a real email server: emails come from *your* Outlook when *you* tap send, instead of automatically from the app. For an approval workflow where you're the human in the loop anyway, this is actually cleaner and safer.

If you approve, I build the whole thing in one go and test it end-to-end before telling you it's ready.