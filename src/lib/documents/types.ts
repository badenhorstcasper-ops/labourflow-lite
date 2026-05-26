// Shared types for the document generation system.
// PLATFORM_NAME is the only place we identify the platform brand.
export const PLATFORM_NAME = "iNRECO";

export type CompanyProfile = {
  owner_user_id: string;
  company_name: string;
  trading_name?: string | null;
  registration_number?: string | null;
  vat_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  accent_color: string; // hex like #2563eb
  signatory_name?: string | null;
  signatory_title?: string | null;
};

export type SignatureBlock = { label: string; name?: string };

export type DocBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "spacer" };

export type DocumentTemplate = {
  /** Stable type key, e.g. "warning", "contract" */
  type: string;
  /** Visible document title, e.g. "Written Warning" */
  title: string;
  /** Optional subtitle / recipient line, e.g. "Issued to: John Doe" */
  subtitle?: string;
  /** Body content as portable blocks (renderer-agnostic) */
  body: DocBlock[];
  /** Signature blocks rendered at the end. Default: signatory + employee. */
  signatures?: SignatureBlock[];
  /** Whether DOCX should be produced too. Default true. */
  produceDocx?: boolean;
};

export type RenderContext = {
  template: DocumentTemplate;
  company: CompanyProfile;
  docNumber: string;
  generatedAt: Date;
};

export function companyAddressLine(c: CompanyProfile): string {
  return [c.address_line1, c.address_line2, c.city, c.postal_code, c.country]
    .filter(Boolean)
    .join(", ");
}

export function companyFooterLine(c: CompanyProfile): string {
  return [
    companyAddressLine(c),
    c.contact_email,
    c.contact_phone,
    c.website,
  ]
    .filter(Boolean)
    .join("  ·  ");
}

export function companyHeaderMeta(c: CompanyProfile): string {
  return [
    c.registration_number ? `Reg: ${c.registration_number}` : null,
    c.vat_number ? `VAT: ${c.vat_number}` : null,
  ]
    .filter(Boolean)
    .join("   ");
}

export function defaultSignatures(c: CompanyProfile): SignatureBlock[] {
  return [
    { label: c.signatory_title || "Authorised Signatory", name: c.signatory_name || undefined },
    { label: "Employee" },
  ];
}
