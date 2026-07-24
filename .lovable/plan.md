
## Your branding stays 100% iNRECO — confirmed

Transferring the domain into Lovable only changes **who answers DNS lookups behind the scenes**. Your public identity does not change:

- Your website stays at **app.inreco.co.za** and **inreco.co.za**
- Your emails will come from **notify.inreco.co.za** (e.g. `noreply@inreco.co.za`)
- No visitor, customer, or email recipient ever sees the word "Lovable" anywhere
- The `ns5.lovable.cloud` / `ns6.lovable.cloud` names are internal DNS server addresses — they are never shown in any browser, email header the user sees, or link

## What I'll do once you approve

1. **You do (2 minutes, one time):** In Lovable, open **Workspace Settings → Workspace domains**, click **Transfer domain**, and enter `inreco.co.za`. Lovable will import your existing DNS records (website, existing email forwarding, etc.) so nothing breaks. Follow the prompts to update the root nameservers at Domains.co.za to Lovable's — this is the only registrar-side action.
2. **I do (automatically after the transfer):**
   - Set the sender domain to `notify.inreco.co.za` and let Lovable auto-create the NS delegation (no manual DNS steps needed from you).
   - Confirm DNS is verified.
   - Build the three iNRECO-branded partner emails: admin alert, applicant auto-reply, approval + referral code.
   - Wire them into `submit-partner-application` and `approve-salesperson`.
   - Deploy the updated backend functions.
   - Send a real test through the partner signup flow and confirm each email lands in the send log with status "sent" before handing back to you.

## What I need from you now

Just approve this plan. After you approve, I'll give you the single transfer button/link to click, wait for the transfer to complete, then do everything else and only come back to you once emails have been tested and verified working.
