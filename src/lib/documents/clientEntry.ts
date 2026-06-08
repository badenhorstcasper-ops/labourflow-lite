// Exposes window.iNRECO.{generatePdf,generateDocx} so the legacy vanilla
// index.html app can produce branded PDF / Word documents using the same
// house-style renderer as the React `/account-app/*` flows.
//
// Imported (for side effects) from src/main.tsx so it loads on EVERY page,
// including the legacy SPA entry point at `/`.

import { renderPdf } from "./renderPdf";
import { renderDocx } from "./renderDocx";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyProfile, DocBlock, DocumentTemplate } from "./types";

const FORBIDDEN = new RegExp(["labour" + "flow", "inreco\\s+consulting", "powered\\s+by"].join("|"), "i");

function cleanText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((ln) => !FORBIDDEN.test(ln))
    .join("\n")
    .trim();
}

function textToBlocks(text: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const paragraphs = cleanText(text).split(/\n\s*\n/);
  let pendingList: string[] | null = null;
  const flushList = () => {
    if (pendingList && pendingList.length) {
      blocks.push({ kind: "list", items: pendingList });
    }
    pendingList = null;
  };
  for (const para of paragraphs) {
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const allBullets = lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));
    if (allBullets) {
      flushList();
      pendingList = lines.map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, ""));
      flushList();
      continue;
    }
    flushList();
    for (const ln of lines) {
      // Treat ALL CAPS short lines as headings.
      if (ln.length <= 80 && ln === ln.toUpperCase() && /[A-Z]/.test(ln)) {
        blocks.push({ kind: "h", text: ln });
      } else {
        blocks.push({ kind: "p", text: ln });
      }
    }
  }
  flushList();
  return blocks;
}

async function loadCompanyProfile(): Promise<CompanyProfile> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("not_signed_in");
  const { data } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (data && data.company_name) {
    return data as unknown as CompanyProfile;
  }
  // No profile yet — never block the download. Use safe defaults.
  return {
    owner_user_id: user.id,
    company_name: user.email ? user.email.split("@")[0] : "Your company",
    accent_color: "#2563eb",
  } as CompanyProfile;
}

async function nextDocNumber(ownerId: string): Promise<string> {
  try {
    const { data } = await supabase.rpc("next_document_number", { _owner: ownerId });
    if (data) return String(data);
  } catch {
    // fallthrough
  }
  const ts = new Date();
  const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, "0")}${String(ts.getDate()).padStart(2, "0")}${String(ts.getHours()).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}`;
  return `DOC-${stamp}`;
}

function downloadBlob(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "document";
}

async function buildContext(title: string, text: string) {
  const company = await loadCompanyProfile();
  const docNumber = await nextDocNumber(company.owner_user_id);
  const template: DocumentTemplate = {
    type: "wizard",
    title,
    body: textToBlocks(text),
  };
  return { template, company, docNumber, generatedAt: new Date() };
}

export async function generatePdfFromText(title: string, text: string) {
  const ctx = await buildContext(title, text);
  const bytes = await renderPdf(ctx);
  downloadBlob(bytes, `${safeFilename(title)}_${ctx.docNumber}.pdf`, "application/pdf");
}

export async function generateDocxFromText(title: string, text: string) {
  const ctx = await buildContext(title, text);
  const bytes = await renderDocx(ctx);
  downloadBlob(
    bytes,
    `${safeFilename(title)}_${ctx.docNumber}.docx`,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

// Attach to window so legacy index.html can call it.
declare global {
  interface Window {
    iNRECO?: {
      generatePdf: typeof generatePdfFromText;
      generateDocx: typeof generateDocxFromText;
    };
  }
}

if (typeof window !== "undefined") {
  window.iNRECO = {
    generatePdf: generatePdfFromText,
    generateDocx: generateDocxFromText,
  };
}
