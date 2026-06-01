import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

// ============================================================================
// EDIT: Company details (used in all three legal pages).
// These details come from the iNRECO Information Regulator POPIA registration.
// ============================================================================
export const COMPANY = {
  brand: "iNRECO",
  legalName: "INRECO CONSULTING",
  proprietor: "Casper Hendrik Badenhorst",
  type: "Sole proprietorship",
  contactEmail: "info@inreco.co.za",
  appUrl: "https://app.inreco.co.za",
  informationOfficer: "Casper Hendrik Badenhorst",
  ioEmail: "info@inreco.co.za",
  regulatorRegNumber: "2026-010530",
  regulatorRegDate: "24 April 2026",
  governingLaw: "the Republic of South Africa",
  lastUpdated: "1 June 2026",
};

// Information Regulator (South Africa) public contact details
const REGULATOR = {
  name: "Information Regulator (South Africa)",
  address: "JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001",
  email: "complaints.IR@justice.gov.za",
  enquiries: "enquiries@inforegulator.org.za",
  web: "https://inforegulator.org.za",
};

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight text-lg">
            {COMPANY.brand}
          </Link>
          <nav className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/disclaimer" className="hover:underline">Disclaimer</Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: {COMPANY.lastUpdated}
        </p>
        <Card className="mt-6">
          <CardContent className="prose prose-sm dark:prose-invert max-w-none py-6 leading-relaxed [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1">
            {children}
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Questions? Email{" "}
          <a className="underline" href={`mailto:${COMPANY.contactEmail}`}>
            {COMPANY.contactEmail}
          </a>
          .
        </p>
      </main>
    </div>
  );
}

export { REGULATOR };
