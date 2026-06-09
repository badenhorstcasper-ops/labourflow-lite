// Exposes window.iNRECO.{generatePdf,generateDocx} so the legacy vanilla
// index.html app can produce branded PDF / Word documents using the same
// house-style renderer as the React `/account-app/*` flows.
//
// Imported (for side effects) from src/main.tsx so it loads on EVERY page,
// including the legacy SPA entry point at `/`.

import { renderPdf } from "./renderPdf";
import { renderDocx } from "./renderDocx";
import { supabase } from "@/integrations/supabase/client";
import type { CompanyProfile, DocBlock, DocumentTemplate, InlineRun } from "./types";

const FORBIDDEN = new RegExp(["labour" + "flow", "inreco\\s+consulting", "powered\\s+by"].join("|"), "i");

function cleanText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .filter((ln) => !FORBIDDEN.test(ln))
    .join("\n")
    .trim();
}

// Match 1+ asterisks on each side (handles **bold**, ***bold***, stray *bold*).
const BOLD_RE = /\*+([^*\n]+?)\*+/g;
// Strip any leftover asterisks as a final safety net so nothing leaks through.
function killAsterisks(s: string): string {
  return s.replace(/\*+/g, "").replace(/\s{2,}/g, " ").trim();
}

function parseInline(s: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(BOLD_RE.source, "g");
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      const plain = s.slice(last, m.index).replace(/\*+/g, "");
      if (plain) runs.push({ text: plain });
    }
    runs.push({ text: m[1].trim(), bold: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) {
    const tail = s.slice(last).replace(/\*+/g, "");
    if (tail) runs.push({ text: tail });
  }
  return runs.length ? runs : [{ text: killAsterisks(s) }];
}

function stripBold(s: string): string {
  return killAsterisks(s.replace(new RegExp(BOLD_RE.source, "g"), "$1"));
}

function isHeadingLine(ln: string): boolean {
  const t = ln.trim();
  // A line entirely wrapped in asterisks: **X**, ***X***, *X*
  if (/^\*+[^*][^*\n]*?\*+$/.test(t)) return true;
  // Heading-style line with trailing colon, e.g. "**Background:**"
  if (/^\*+[^*][^*\n]*?\*+\s*:?\s*$/.test(t)) return true;
  return false;
}

function isHorizontalRule(ln: string): boolean {
  return /^(-{3,}|_{3,}|\*{3,})$/.test(ln.trim());
}

function textToBlocks(text: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const paragraphs = cleanText(text).split(/\n\s*\n/);
  let pendingList: string[] | null = null;
  const flushList = () => {
    if (pendingList && pendingList.length) {
      blocks.push({
        kind: "list",
        items: pendingList.map(stripBold),
        itemRuns: pendingList.map(parseInline),
      });
    }
    pendingList = null;
  };
  for (const para of paragraphs) {
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every(isHorizontalRule)) {
      flushList();
      blocks.push({ kind: "spacer" });
      continue;
    }
    const allBullets = lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));
    if (allBullets) {
      flushList();
      pendingList = lines.map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, ""));
      flushList();
      continue;
    }
    flushList();
    for (const ln of lines) {
      if (isHorizontalRule(ln)) {
        blocks.push({ kind: "spacer" });
        continue;
      }
      if (isHeadingLine(ln)) {
        blocks.push({ kind: "h", text: stripBold(ln) });
        continue;
      }
      if (ln.length <= 80 && ln === ln.toUpperCase() && /[A-Z]/.test(ln)) {
        blocks.push({ kind: "h", text: stripBold(ln) });
      } else {
        blocks.push({ kind: "p", text: stripBold(ln), runs: parseInline(ln) });
      }
    }
  }
  flushList();
  return blocks;
}


async function loadCompanyProfile(): Promise<CompanyProfile> {
  // Best-effort: the legacy vanilla app and the React app talk to DIFFERENT
  // Supabase projects, so the user may have no session on the Cloud client
  // even though they ARE signed in on the legacy side. Never block the
  // download — fall through to safe defaults if anything fails.
  let user: { id: string; email?: string | null } | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    user = userData.user ?? null;
  } catch {
    /* ignore */
  }

  if (user) {
    try {
      const { data } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (data && (data as { company_name?: string }).company_name) {
        return data as unknown as CompanyProfile;
      }
    } catch {
      /* ignore */
    }
  }

  // Try to read company name the legacy app may have stashed on window.
  const legacy = (typeof window !== "undefined"
    ? (window as unknown as { iNRECO?: { companyName?: string } }).iNRECO
    : undefined);
  const fallbackName =
    legacy?.companyName ||
    (user?.email ? user.email.split("@")[0] : "Your company");

  return {
    owner_user_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
    company_name: fallbackName,
    accent_color: "#2563eb",
  } as CompanyProfile;
}

async function nextDocNumber(ownerId: string): Promise<string> {
  // Only attempt the Cloud RPC when we actually have a Cloud session for
  // this owner — otherwise it 401s and adds noise. Fall back to a local
  // timestamp-based number so downloads are never blocked.
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user && userData.user.id === ownerId) {
      const { data } = await supabase.rpc("next_document_number", { _owner: ownerId });
      if (data) return String(data);
    }
  } catch {
    /* fallthrough */
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
    title: killAsterisks(title),
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
