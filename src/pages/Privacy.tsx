import { LegalLayout, COMPANY, REGULATOR } from "./Legal";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how <strong>{COMPANY.legalName}</strong>{" "}
        (trading as <strong>{COMPANY.brand}</strong>) collects, uses, shares and
        protects your personal information when you use{" "}
        <a href={COMPANY.appUrl}>{COMPANY.appUrl}</a> (the "Service"). It is
        issued in compliance with the Protection of Personal Information Act 4
        of 2013 ("POPIA").
      </p>

      <h2>1. Responsible party</h2>
      <ul>
        <li><strong>Responsible party:</strong> {COMPANY.legalName} ({COMPANY.type})</li>
        <li><strong>Proprietor:</strong> {COMPANY.proprietor}</li>
        <li><strong>Information Officer:</strong> {COMPANY.informationOfficer} — <a href={`mailto:${COMPANY.ioEmail}`}>{COMPANY.ioEmail}</a></li>
        <li><strong>Information Regulator registration:</strong> {COMPANY.regulatorRegNumber} (registered {COMPANY.regulatorRegDate})</li>
        <li><strong>Contact:</strong> <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a></li>
      </ul>

      <h2>2. What personal information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> email address, password (hashed), display name.</li>
        <li><strong>Company profile:</strong> company name, trading name, registration number, VAT number, address, signatory name and title, logo, brand colour, contact phone and email.</li>
        <li><strong>Generated documents:</strong> the content of warnings, hearing notices, contracts and other documents you create using the Service, plus metadata such as document type, title and timestamps.</li>
        <li><strong>Team information:</strong> email addresses of team members you invite.</li>
        <li><strong>Payment metadata:</strong> plan name, subscription status, trial end date, last four digits of the payment token and PayFast transaction ID. We never see or store your full card number.</li>
        <li><strong>Device and technical data:</strong> device identifier, user agent, IP-derived country, last-seen timestamp, browser console error reports.</li>
        <li><strong>Communications:</strong> messages you send to us via the contact form or bug-report feature.</li>
      </ul>

      <h2>3. Why we process it (purpose and lawful basis)</h2>
      <ul>
        <li><strong>To provide the Service</strong> — performance of our contract with you (POPIA s 11(1)(b)).</li>
        <li><strong>To bill you and manage subscriptions</strong> — contract performance and our legitimate interest in being paid (s 11(1)(b), s 11(1)(f)).</li>
        <li><strong>To secure the Service</strong> — legitimate interest in preventing fraud, abuse and unauthorised access (s 11(1)(f)).</li>
        <li><strong>To improve the Service</strong> — legitimate interest in fixing bugs and improving features, using aggregated or de-identified data wherever practical.</li>
        <li><strong>To comply with law</strong> — tax, accounting and regulatory obligations (s 11(1)(c)).</li>
        <li><strong>Marketing</strong> — only with your consent or where you are an existing customer for similar services, and you can opt out at any time.</li>
      </ul>

      <h2>4. Who we share it with (operators and recipients)</h2>
      <ul>
        <li><strong>Lovable Cloud (Supabase) — hosting & database operator:</strong> stores your account, profile, documents and logs. Bound by an operator agreement and POPIA-equivalent terms.</li>
        <li><strong>PayFast (Pty) Ltd — payments operator:</strong> handles card capture, recurring debits and trial activation. PayFast is a South African PSP regulated under the National Payment System.</li>
        <li><strong>Email delivery provider:</strong> used for transactional emails (sign-up confirmations, password resets, invoices).</li>
        <li><strong>AI inference provider (Lovable AI Gateway):</strong> processes prompts you submit to CARA. Prompts are sent in real time and are not used to train third-party models.</li>
        <li><strong>Legal and regulatory authorities</strong> when required by law.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>5. Cross-border transfers</h2>
      <p>
        Some of our operators store or process data outside South Africa.
        Where this happens, we rely on POPIA section 72 — the recipient is in a
        jurisdiction with comparable data-protection law, or is bound by binding
        corporate rules or contractual safeguards equivalent to POPIA.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li><strong>Account and profile:</strong> for as long as your account is active, plus 12 months after closure unless a longer period is required by law.</li>
        <li><strong>Generated documents:</strong> kept on your behalf until you delete them or close your account.</li>
        <li><strong>Payment records:</strong> retained for at least five (5) years to comply with tax law (Tax Administration Act).</li>
        <li><strong>Error logs and security logs:</strong> 90 days.</li>
        <li><strong>Contact / bug-report messages:</strong> 24 months.</li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We use industry-standard measures to protect personal information,
        including TLS encryption in transit, encrypted database storage,
        row-level security policies, breached-password protection (HIBP) on
        sign-up, two-device limit per account, and access logging. No system is
        perfectly secure; if a breach affects your data we will notify you and
        the Information Regulator as required by POPIA section 22.
      </p>

      <h2>8. Your rights as a data subject</h2>
      <p>Under POPIA you have the right to:</p>
      <ul>
        <li>be notified about the collection and any compromise of your personal information;</li>
        <li>request access to the personal information we hold about you;</li>
        <li>request correction, deletion or destruction of inaccurate or excessive personal information;</li>
        <li>object, on reasonable grounds, to the processing of your personal information;</li>
        <li>object to direct marketing and withdraw any consent you previously gave;</li>
        <li>lodge a complaint with the Information Regulator.</li>
      </ul>
      <p>
        To exercise any of these rights, email our Information Officer at{" "}
        <a href={`mailto:${COMPANY.ioEmail}`}>{COMPANY.ioEmail}</a>. We respond
        to verified requests within 30 days. The official PAIA / POPIA request
        form (Form 2 / Form 1) may be required.
      </p>

      <h2>9. Cookies and local storage</h2>
      <p>
        The Service uses essential local storage only — to keep you signed in
        and to remember preferences such as the install prompt. We do not use
        third-party advertising cookies or cross-site tracking. Because this is
        strictly necessary for the Service to work, POPIA does not require us
        to ask for opt-in consent.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is intended for employers and is not directed at children
        under 18. We do not knowingly collect information from children.
      </p>

      <h2>11. Information Regulator (your complaint channel)</h2>
      <p>If you are not satisfied with how we handle your personal information, you may complain to:</p>
      <ul>
        <li><strong>{REGULATOR.name}</strong></li>
        <li>Address: {REGULATOR.address}</li>
        <li>Complaints email: <a href={`mailto:${REGULATOR.email}`}>{REGULATOR.email}</a></li>
        <li>Enquiries email: <a href={`mailto:${REGULATOR.enquiries}`}>{REGULATOR.enquiries}</a></li>
        <li>Web: <a href={REGULATOR.web} target="_blank" rel="noreferrer">{REGULATOR.web}</a></li>
      </ul>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. The "Last updated" date at
        the top reflects the latest revision. We will email you about material
        changes that affect your rights.
      </p>
    </LegalLayout>
  );
}
