Goal: Switch on email sending from the app's own domain (app.inreco.co.za) so partner-application notifications and other app emails actually reach inboxes, with correct iNRECO branding.

1. Configure the email sender domain
   - Open Lovable's email-domain setup dialog.
   - Use the existing custom domain app.inreco.co.za as the sender domain (e.g. noreply@app.inreco.co.za or notify@app.inreco.co.za).
   - Lovable will generate the exact DNS records to paste at Domains.co.za.
   - Wait for DNS verification (usually minutes to a few hours).

2. Set up Lovable email infrastructure
   - Run the one-click email infrastructure setup so queues, send logs and Edge Functions are provisioned.

3. Scaffold the email templates
   - Generate auth email templates (signup, magic link, password reset, etc.).
   - Generate transactional email templates for the partner flow:
     * New partner application alert to admins
     * Auto-reply to the applicant
     * Approval email with referral code
   - Replace every occurrence of "LabourFlow Lite" with "iNRECO" and use the iNRECO logo / brand colours.

4. Wire the partner emails into the app
   - Update submit-partner-application to send the admin alert and applicant auto-reply.
   - Update approve-salesperson to send the approval + referral-code email.
   - Keep the existing notification_log inserts as an audit trail.

5. Deploy and test
   - Deploy the affected Edge Functions.
   - Run a partner signup test and confirm emails are queued/sent in the email send log.

What the user needs to do:
- Click the "Set up email domain" button when shown.
- Select app.inreco.co.za in the dialog.
- Copy the DNS records Lovable provides into Domains.co.za's DNS page.
- Reply "done" so I can continue with steps 2–5.