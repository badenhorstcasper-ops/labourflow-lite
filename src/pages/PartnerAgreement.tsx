import { Link } from "react-router-dom";
import {
  PARTNER_AGREEMENT_CLAUSES,
  PARTNER_AGREEMENT_EFFECTIVE_DATE,
  PARTNER_AGREEMENT_VERSION,
} from "@/lib/partnerAgreement";
import { Button } from "@/components/ui/button";

export default function PartnerAgreement() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold">iNRECO</Link>
          <Link to="/partner/apply"><Button size="sm">Apply to become a partner</Button></Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">iNRECO Partner Agreement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Version {PARTNER_AGREEMENT_VERSION} · Effective {PARTNER_AGREEMENT_EFFECTIVE_DATE} · Governed by South African law
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p>
            <b>Please read this carefully.</b> This document sets out the terms under which you promote iNRECO
            in exchange for a monthly referral commission. It is written in plain language so that both parties
            understand exactly what is — and is not — being agreed. The most important point: this is
            <b> a commercial referral relationship, not employment</b>.
          </p>
        </div>

        <ol className="space-y-5">
          {PARTNER_AGREEMENT_CLAUSES.map((c) => (
            <li key={c.n} className="space-y-1">
              <h2 className="font-semibold text-lg">
                {c.n}. {c.title}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>

        <div className="border-t pt-6 text-xs text-muted-foreground">
          <p>
            Questions? Email <a className="underline" href="mailto:info@inreco.co.za">info@inreco.co.za</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
