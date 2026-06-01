import { LegalLayout, COMPANY } from "./Legal";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use">
      <p>
        These Terms of Use ("Terms") govern your access to and use of the{" "}
        {COMPANY.brand} web application available at{" "}
        <a href={COMPANY.appUrl}>{COMPANY.appUrl}</a> (the "Service"). The Service
        is operated by <strong>{COMPANY.legalName}</strong>, a {COMPANY.type.toLowerCase()}{" "}
        established in {COMPANY.governingLaw}, trading as <strong>{COMPANY.brand}</strong>{" "}
        (referred to as "we", "us" or "our"). By creating an account, subscribing
        to a plan, or using any part of the Service, you agree to be bound by
        these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Supplier information (ECTA s 43)</h2>
      <p>The following information is provided in compliance with section 43 of the Electronic Communications and Transactions Act 25 of 2002:</p>
      <ul>
        <li><strong>Legal name:</strong> {COMPANY.legalName}</li>
        <li><strong>Trading name:</strong> {COMPANY.brand}</li>
        <li><strong>Proprietor:</strong> {COMPANY.proprietor}</li>
        <li><strong>Business form:</strong> {COMPANY.type}</li>
        <li><strong>Place of business:</strong> {COMPANY.governingLaw}</li>
        <li><strong>Contact email:</strong> {COMPANY.contactEmail}</li>
        <li><strong>Website:</strong> {COMPANY.appUrl}</li>
      </ul>

      <h2>2. The Service</h2>
      <p>
        {COMPANY.brand} provides South African employers and people leaders with
        industrial-relations guidance, an AI adviser ("CARA"), document templates,
        and document generation tools. The Service is a productivity tool. It is{" "}
        <strong>not</strong> legal representation and does not replace advice from
        a qualified labour relations practitioner or admitted attorney.
        Please read our <a href="/disclaimer">Disclaimer</a> for details.
      </p>

      <h2>3. Accounts</h2>
      <ul>
        <li>You must be at least 18 years old and authorised to bind any organisation you represent.</li>
        <li>You are responsible for keeping your password confidential and for all activity on your account.</li>
        <li>Each account is limited to two (2) active devices. Team plans add additional seats per the chosen plan.</li>
        <li>We may suspend or terminate accounts that breach these Terms or that we reasonably believe are being used unlawfully.</li>
      </ul>

      <h2>4. Subscriptions, free trial and billing</h2>
      <ul>
        <li>Paid plans (Solo, Business, Professional) start with a <strong>7-day free trial</strong>. No amount is debited during the trial.</li>
        <li>If you do not cancel before the trial ends, your card is debited the plan price shown on the pricing page on the first day after the trial, and monthly thereafter, until you cancel.</li>
        <li>All payments are processed by PayFast (Pty) Ltd, an authorised South African payment service provider. We do not store your full card details.</li>
        <li>Prices are shown in South African Rand (ZAR) and include VAT where applicable.</li>
        <li>You may cancel your subscription at any time from your account. Cancellation takes effect at the end of the current billing cycle; we do not pro-rate refunds for partial months.</li>
      </ul>

      <h2>5. Cooling-off / right to cancel (ECTA s 44)</h2>
      <p>
        Under section 44 of the Electronic Communications and Transactions Act,
        consumers may cancel certain electronic transactions within seven (7) days
        without reason and without penalty. The 7-day free trial honours and
        exceeds this right: you may cancel during the trial at no cost. Where
        section 44 applies after the trial, you may request a refund of the most
        recent monthly charge by emailing{" "}
        <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>{" "}
        within seven (7) days of that charge, provided you have not made
        substantial use of the Service during that period.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for any unlawful, fraudulent, harassing or abusive purpose;</li>
        <li>upload personal information of third parties without a lawful basis under POPIA;</li>
        <li>attempt to gain unauthorised access to the Service, its data, or other users' accounts;</li>
        <li>copy, scrape, reverse-engineer, resell or republish any part of the Service or its outputs except for your own internal business use; or</li>
        <li>share your login credentials beyond your registered seats.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        The Service, including its software, text, templates, AI prompts and
        branding, is owned by {COMPANY.legalName} and protected by copyright and
        trade-mark law. Subject to your compliance with these Terms, we grant you
        a non-exclusive, non-transferable, revocable licence to use the Service
        for your lawful business purposes. Documents you generate using the
        Service belong to you; the underlying templates and software remain ours.
      </p>

      <h2>8. AI-generated content</h2>
      <p>
        Responses produced by CARA and other AI features are generated by large
        language models and may be incomplete, out-of-date or incorrect. You must
        review every AI output before relying on or sending it to an employee,
        union, CCMA or court. We accept no liability for losses arising from
        unreviewed reliance on AI output. See our{" "}
        <a href="/disclaimer">Disclaimer</a>.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {COMPANY.legalName} is not liable
        for any indirect, incidental, special, consequential or punitive damages,
        or any loss of profits, revenue, data or goodwill, arising from your use
        of (or inability to use) the Service. Our total liability for direct
        damages in any twelve-month period is limited to the subscription fees
        you paid us in that period. Nothing in these Terms limits any liability
        that cannot be limited by law (including under the Consumer Protection
        Act 68 of 2008 where it applies).
      </p>

      <h2>10. Termination</h2>
      <p>
        You may terminate your account at any time by cancelling your
        subscription and contacting us to delete your data. We may terminate or
        suspend your access if you breach these Terms. On termination your right
        to use the Service ends immediately; sections 7, 8, 9 and 11 survive.
      </p>

      <h2>11. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of {COMPANY.governingLaw}. Any
        dispute will first be addressed in good faith between the parties by
        email. If unresolved within 30 days, the dispute will be referred to the
        appropriate court in South Africa, unless either party prefers
        arbitration under the rules of the Arbitration Foundation of Southern
        Africa (AFSA).
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We will post the new
        version on this page and update the "Last updated" date. Material
        changes will be notified by email. Continued use of the Service after
        changes take effect constitutes acceptance.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a>.
      </p>
    </LegalLayout>
  );
}
