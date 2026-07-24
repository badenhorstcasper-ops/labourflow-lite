
## What's actually wrong

When someone signs up as a partner, the app writes a "please notify" note into a table — but **nothing ever reads that note and sends an email**. No email service is switched on for this project yet. That's why nothing arrived in your inbox.

Same thing for the unique referral number: the code is generated the moment you (admin) hit "Approve" on the partner in the admin screen — but because you never got the "new application" email, you never went in to approve it, so no code got made and no code got sent back to the partner.

## The fix, in plain steps

**1. Turn on email sending for the app (one-time setup, needs you)**

The app can't send real emails until a sender domain is switched on. I'll open the email setup box — you pick something like `notify.inreco.co.za` (a sub-name under your existing domain). You'll get a short list of DNS entries to paste into wherever your domain is registered. After DNS confirms (can take a few minutes to a few hours), sending is live.

*Why this step exists:* every legitimate email service in the world requires you to prove you own the domain you're sending from. Without this, Gmail/Outlook silently bin the emails.

**2. Build three ready-to-send emails**

- **"New partner application"** — goes to both your addresses (`casperbadenhorst77@outlook.com` and `badenhorst.casper@gmail.com`) the moment someone applies. Includes the applicant's name, email, phone, and a direct link to the admin approval screen.
- **"We got your application"** — auto-reply to the applicant so they know it arrived.
- **"You're approved — here's your referral code"** — goes to the partner the moment you click Approve. Includes their unique code, the Partner Portal link, and the marketing kit link.

**3. Wire the sending into the two backend actions that already exist**

- The partner submit action will send emails #1 and #2 right after saving the application.
- The approve action will send email #3 right after generating the code.

**4. Safety net for anything already stuck**

There's already at least one application sitting in the system (yours from the test) that never triggered a notification. Once approval email is wired in, I'll walk you through approving it in the admin screen so the referral code gets created and emailed — that's your first live end-to-end test.

## What you'll need to do

- Click the "Set up email domain" button when I open it, pick the sub-name, and paste the DNS entries at your domain registrar. That's it.
- After DNS is confirmed, approve the test partner application in the admin area to prove the whole loop works.

## Technical notes (for the record)

- Uses Lovable's built-in email infrastructure (no third-party API keys, no extra bill).
- Templates live in `supabase/functions/_shared/transactional-email-templates/`.
- `submit-partner-application` and `approve-salesperson` edge functions get `send-transactional-email` invocations added; existing `notification_log` inserts stay as an audit trail.
- Emails are queued and retried automatically; failures land in the send log for you to inspect.
