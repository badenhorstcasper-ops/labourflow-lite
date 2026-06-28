import { supabase } from "@/integrations/supabase/client";
import { renderPdf } from "./renderPdf";
import { renderDocx } from "./renderDocx";
import { resolveLogoUrl } from "@/lib/companyLogo";
import type { CompanyProfile, DocumentTemplate, RenderContext } from "./types";

export * from "./types";
export { renderPdf, renderDocx };

export type GenerateResult = {
  id: string;
  doc_number: string;
  pdf_url: string;
  docx_url: string | null;
  share_url: string;
  share_token: string;
};

async function loadCompanyProfile(): Promise<CompanyProfile> {
  // Resolve account owner (owner or team-member's owner)
  const { data: ownerData, error: ownerErr } = await supabase.rpc("current_account_owner");
  if (ownerErr) throw ownerErr;
  const owner = ownerData as unknown as string;

  const { data } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("owner_user_id", owner)
    .maybeSingle();

  if (data && data.company_name) {
    const profile = data as unknown as CompanyProfile;
    // Sign the logo so renderers can fetch the bytes — bucket is now private.
    const signed = await resolveLogoUrl(profile.logo_url);
    return { ...profile, logo_url: signed } as CompanyProfile;
  }

  // Fallback: no profile yet (or empty company name).
  // Generate the document anyway with sensible defaults so the user is
  // never blocked. They can add branding later in Company profile.
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email || "";
  return {
    owner_user_id: owner,
    company_name: email ? email.split("@")[0] : "Your company",
    accent_color: "#2563eb",
  } as CompanyProfile;
}

function shareUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/d/${token}`;
}

export async function generateDocument(template: DocumentTemplate): Promise<GenerateResult> {
  const company = await loadCompanyProfile();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("not_authenticated");

  const { data: numData, error: numErr } = await supabase.rpc("next_document_number", {
    _owner: company.owner_user_id,
  });
  if (numErr) throw numErr;
  const docNumber = numData as unknown as string;

  const ctx: RenderContext = {
    template,
    company,
    docNumber,
    generatedAt: new Date(),
  };

  const pdfBytes = await renderPdf(ctx);
  const produceDocx = template.produceDocx !== false;
  const docxBytes = produceDocx ? await renderDocx(ctx) : null;

  const baseId = crypto.randomUUID();
  const folder = `${company.owner_user_id}/${baseId}`;
  const pdfPath = `${folder}/${docNumber}.pdf`;
  const docxPath = docxBytes ? `${folder}/${docNumber}.docx` : null;

  const pdfBlob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const { error: pdfErr } = await supabase.storage.from("documents").upload(pdfPath, pdfBlob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (pdfErr) throw pdfErr;

  if (docxBytes && docxPath) {
    const docxBlob = new Blob([docxBytes as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const { error: docxErr } = await supabase.storage
      .from("documents")
      .upload(docxPath, docxBlob, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });
    if (docxErr) throw docxErr;
  }

  const { data: row, error: insErr } = await supabase
    .from("generated_documents")
    .insert({
      id: baseId,
      owner_user_id: company.owner_user_id,
      created_by_user_id: user.id,
      doc_type: template.type,
      title: template.title,
      doc_number: docNumber,
      pdf_path: pdfPath,
      docx_path: docxPath,
    })
    .select("*")
    .single();
  if (insErr) throw insErr;

  const { data: pdfSigned } = await supabase.storage
    .from("documents")
    .createSignedUrl(pdfPath, 60 * 60);
  const { data: docxSigned } = docxPath
    ? await supabase.storage.from("documents").createSignedUrl(docxPath, 60 * 60)
    : { data: null as { signedUrl: string } | null };

  return {
    id: row.id,
    doc_number: docNumber,
    pdf_url: pdfSigned?.signedUrl || "",
    docx_url: docxSigned?.signedUrl || null,
    share_url: shareUrl(row.share_token),
    share_token: row.share_token,
  };
}
