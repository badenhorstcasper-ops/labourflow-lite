// Helpers for building `mailto:` links used by the partner flow.
// This keeps the app free of any real email-server setup — the user's own
// email client does the actual sending.

const ADMIN_INBOX = "info@inreco.co.za";
const ORIGIN = "https://app.inreco.co.za";

function toMailto(to: string, subject: string, body: string) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type ApplicationSummary = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_number: string;
  banking: {
    bank_name?: string;
    account_holder?: string;
    account_number?: string;
    branch_code?: string;
    account_type?: string;
  };
  agreement_version: string;
  signed_name: string;
  timestamp: string;
};

export function buildApplicationMailto(a: ApplicationSummary) {
  const approve = `${ORIGIN}/admin/partner-decision?id=${a.id}&action=approve`;
  const reject = `${ORIGIN}/admin/partner-decision?id=${a.id}&action=reject`;
  const body = [
    `New iNRECO partner application`,
    ``,
    `Name: ${a.full_name}`,
    `Email: ${a.email}`,
    `Phone: ${a.phone}`,
    `ID number: ${a.id_number}`,
    ``,
    `Banking:`,
    `  Bank: ${a.banking.bank_name || "-"}`,
    `  Account holder: ${a.banking.account_holder || "-"}`,
    `  Account number: ${a.banking.account_number || "-"}`,
    `  Branch code: ${a.banking.branch_code || "-"}`,
    `  Type: ${a.banking.account_type || "-"}`,
    ``,
    `Agreement version: ${a.agreement_version}`,
    `Signed as: ${a.signed_name}`,
    `Submitted: ${a.timestamp}`,
    ``,
    `--- One-click decision ---`,
    `Approve:  ${approve}`,
    `Reject:   ${reject}`,
    ``,
    `(You must be signed in as an admin. If nothing happens when you tap the link, sign in first at ${ORIGIN}/auth and then tap it again.)`,
  ].join("\n");
  return toMailto(ADMIN_INBOX, `Partner application — ${a.full_name}`, body);
}

export type WelcomePack = {
  full_name: string;
  email: string;
  referral_code: string;
  temporary_password?: string;
};

export function buildWelcomeMailto(w: WelcomePack) {
  const shareLink = `${ORIGIN}/?ref=${w.referral_code}`;
  const pricingLink = `${ORIGIN}/pricing?ref=${w.referral_code}`;
  const body = [
    `Hi ${w.full_name.split(" ")[0]},`,
    ``,
    `Welcome to the iNRECO Partner Programme — your application is approved.`,
    ``,
    `YOUR UNIQUE REFERRAL CODE: ${w.referral_code}`,
    ``,
    `HOW TO EARN`,
    `Share either of these links with anyone in South Africa who employs people:`,
    `  ${shareLink}`,
    `  ${pricingLink}`,
    `Any subscriber who signs up through your link (or types ${w.referral_code}`,
    `on the pricing page) is locked to you for life. You earn a monthly commission`,
    `for as long as they stay subscribed.`,
    ``,
    `Commission per active subscriber, paid monthly:`,
    `  Solo         R50   |  Business  R90`,
    `  Professional R250  |  Enterprise R900`,
    ``,
    `YOUR FREE DEMO ACCESS`,
    `You have free access to the iNRECO app so you can show it to customers.`,
    `Sign in at ${ORIGIN}/auth`,
    `  Email:    ${w.email}`,
    w.temporary_password
      ? `  Password: ${w.temporary_password}   (please change this after first login)`
      : `  Password: use "Forgot password" to set your own`,
    `Note: your demo account works on ONE device only.`,
    ``,
    `YOUR PARTNER PORTAL`,
    `${ORIGIN}/partner  — live sales, commissions, payout history, marketing kit`,
    ``,
    `MARKETING MATERIAL`,
    `Download ready-made flyers, social posts and banners at:`,
    `  ${ORIGIN}/partner/marketing`,
    `Want to use your own material? Email a draft to ${ADMIN_INBOX}`,
    `for approval before posting anything under the iNRECO brand.`,
    ``,
    `STAY ACTIVE`,
    `Bring in at least 1 subscriber every 3 months to keep your free demo`,
    `access. If a full 90 days passes with no new subscribers, the demo`,
    `access is switched off automatically. It switches back on the moment`,
    `you bring in a new subscriber.`,
    ``,
    `Any questions? Reply to this email — we're here to help.`,
    ``,
    `— iNRECO`,
  ].join("\n");
  return toMailto(w.email, `Welcome to iNRECO — your referral code ${w.referral_code}`, body);
}

export function buildRejectionMailto(email: string, full_name: string) {
  const body = [
    `Hi ${full_name.split(" ")[0]},`,
    ``,
    `Thank you for your interest in the iNRECO Partner Programme.`,
    `Unfortunately your application has not been successful at this time.`,
    ``,
    `You're welcome to re-apply in the future.`,
    ``,
    `— iNRECO`,
  ].join("\n");
  return toMailto(email, `Your iNRECO Partner application`, body);
}

export function buildRevokedMailto(email: string, full_name: string, code: string) {
  const body = [
    `Hi ${full_name.split(" ")[0]},`,
    ``,
    `We noticed your referral code ${code} hasn't brought in a new subscriber`,
    `in the last 90 days, so your free demo access to the iNRECO app has been`,
    `switched off, as per our Partner Agreement.`,
    ``,
    `Good news: your referral code is still active. The very next subscriber`,
    `who signs up under ${code} will reactivate your demo access automatically.`,
    ``,
    `Your Partner Portal is still available at ${ORIGIN}/partner`,
    ``,
    `— iNRECO`,
  ].join("\n");
  return toMailto(email, `Your iNRECO demo access — action needed`, body);
}
