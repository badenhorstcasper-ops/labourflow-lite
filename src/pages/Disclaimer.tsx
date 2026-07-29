import { LegalLayout, COMPANY } from "./Legal";
import Seo from "@/components/Seo";

export default function Disclaimer() {
  return (
    <>
      <Seo title="Disclaimer — iNRECO" description="iNRECO provides practical labour compliance guidance and templates; this page explains what that guidance is and is not, and when to get legal advice." path="/disclaimer" />
      <LegalLayout title="Disclaimer">
        <h2>1. Not legal advice</h2>
        <p>
          <strong>{COMPANY.brand}</strong> provides industrial-relations guidance,
          document templates and AI-assisted explanations to help South African
          employers manage day-to-day workplace matters. The Service, including
          the CARA AI adviser and any document it generates, is{" "}
          <strong>not legal advice</strong> and does not create an
          attorney-client, advocate-client or labour-consultant relationship
          between you and {COMPANY.legalName}.
        </p>
  
        <h2>2. You remain responsible</h2>
        <p>
          You are responsible for ensuring that any action you take, document you
          issue, or position you adopt complies with all applicable South African
          law, including but not limited to:
        </p>
        <ul>
          <li>the Labour Relations Act 66 of 1995 (LRA);</li>
          <li>the Basic Conditions of Employment Act 75 of 1997 (BCEA);</li>
          <li>the Employment Equity Act 55 of 1998 (EEA);</li>
          <li>the Occupational Health and Safety Act 85 of 1993 (OHSA);</li>
          <li>the Protection of Personal Information Act 4 of 2013 (POPIA);</li>
          <li>any applicable bargaining-council agreement or sectoral determination; and</li>
          <li>the rules of the CCMA and the Labour Court.</li>
        </ul>
  
        <h2>3. AI output may be inaccurate</h2>
        <p>
          CARA is built on large language models. Its responses can be incomplete,
          out-of-date or factually wrong. Statute references, case names, dates
          and figures should always be verified against the original source
          before you rely on them. Never send an AI-generated letter, warning,
          hearing notice or CCMA reply to a third party without first reading it,
          editing it and confirming that it fits your specific facts.
        </p>
  
        <h2>4. Get a qualified person involved when it matters</h2>
        <p>
          For any complex, high-value, urgent or disputed matter — including
          retrenchments, automatically unfair dismissal claims, CCMA arbitration,
          Labour Court litigation, union recognition, or any matter where an
          attorney is already involved — consult a qualified labour-relations
          practitioner or admitted attorney. {COMPANY.brand} is a productivity
          tool, not a substitute for professional representation.
        </p>
  
        <h2>5. No warranty</h2>
        <p>
          The Service is provided "as is" and "as available" without warranties
          of any kind, whether express or implied, including warranties of
          merchantability, fitness for a particular purpose or non-infringement.
          We do not warrant that the Service will be uninterrupted, error-free or
          that any output will achieve a particular legal outcome.
        </p>
  
        <h2>6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {COMPANY.legalName} and its
          proprietor are not liable for any loss, damage, claim, cost or expense
          (including legal costs, awards or settlements) arising directly or
          indirectly from your use of, or reliance on, the Service or any output
          it produces. See clause 9 of the <a href="/terms">Terms of Use</a> for
          the full limitation.
        </p>
  
        <h2>7. Third-party content</h2>
        <p>
          Where the Service references statutes, case law or third-party
          guidelines, those references are provided for convenience. They do not
          constitute endorsement and we are not responsible for the accuracy or
          availability of third-party material.
        </p>
  
        <h2>8. Acceptance</h2>
        <p>
          By using the Service you confirm that you have read and understood this
          Disclaimer and that you accept its terms together with our{" "}
          <a href="/terms">Terms of Use</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </LegalLayout>
    </>
  );
}
