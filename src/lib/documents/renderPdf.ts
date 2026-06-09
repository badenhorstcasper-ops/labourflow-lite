import {
  PDFDocument,
  StandardFonts,
  rgb,
  PageSizes,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  companyFooterLine,
  companyHeaderMeta,
  defaultSignatures,
  type RenderContext,
} from "./types";

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const MARGIN = 50;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function fetchLogoBytes(url?: string | null): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function renderPdf(ctx: RenderContext): Promise<Uint8Array> {
  const { template, company, docNumber, generatedAt } = ctx;
  const accent = hexToRgb(company.accent_color || "#2563eb");
  const muted = rgb(0.4, 0.45, 0.5);
  const ink = rgb(0.08, 0.1, 0.15);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const [pageW, pageH] = PageSizes.A4;
  const contentW = pageW - MARGIN * 2;

  // logo
  let logoImg: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  const logoBytes = await fetchLogoBytes(company.logo_url);
  if (logoBytes) {
    try {
      logoImg = await pdf.embedPng(logoBytes);
    } catch {
      try {
        logoImg = await pdf.embedJpg(logoBytes);
      } catch {
        logoImg = null;
      }
    }
  }

  let page: PDFPage = pdf.addPage([pageW, pageH]);
  let cursorY = pageH - MARGIN;

  const drawHeader = (p: PDFPage) => {
    let y = pageH - MARGIN;
    // logo
    if (logoImg) {
      const maxH = 40;
      const scale = maxH / logoImg.height;
      const w = Math.min(logoImg.width * scale, 120);
      const h = (w / logoImg.width) * logoImg.height;
      p.drawImage(logoImg, { x: MARGIN, y: y - h, width: w, height: h });
    }
    // company block (right)
    const name = company.company_name || "Your Company";
    const trading = company.trading_name && company.trading_name !== name ? company.trading_name : null;
    const meta = companyHeaderMeta(company);
    let ry = y;
    const drawRight = (text: string, f: PDFFont, size: number, color: RGB) => {
      const tw = f.widthOfTextAtSize(text, size);
      p.drawText(text, { x: pageW - MARGIN - tw, y: ry - size, font: f, size, color });
      ry -= size + 3;
    };
    drawRight(name, bold, 12, ink);
    if (trading) drawRight(trading, font, 9, muted);
    if (meta) drawRight(meta, font, 9, muted);
    // doc number + date on far right under meta
    drawRight(`Doc #: ${docNumber}`, font, 9, muted);
    drawRight(`Date: ${generatedAt.toISOString().slice(0, 10)}`, font, 9, muted);

    // accent rule
    const ruleY = Math.min(y - 56, ry - 6);
    p.drawRectangle({
      x: MARGIN,
      y: ruleY,
      width: contentW,
      height: 2,
      color: accent,
    });
    return ruleY - 24;
  };

  const drawFooter = (p: PDFPage, pageNum: number, pageCount: number) => {
    const footerY = MARGIN - 18;
    p.drawRectangle({
      x: MARGIN,
      y: footerY + 14,
      width: contentW,
      height: 0.5,
      color: muted,
    });
    const footer = companyFooterLine(company) || company.company_name;
    const fSize = 8;
    const lines = wrap(footer, font, fSize, contentW - 80);
    lines.slice(0, 1).forEach((l) =>
      p.drawText(l, { x: MARGIN, y: footerY, font, size: fSize, color: muted })
    );
    const pageLabel = `Page ${pageNum} of ${pageCount}`;
    const pw = font.widthOfTextAtSize(pageLabel, fSize);
    p.drawText(pageLabel, {
      x: pageW - MARGIN - pw,
      y: footerY,
      font,
      size: fSize,
      color: muted,
    });
  };

  const newPage = () => {
    page = pdf.addPage([pageW, pageH]);
    cursorY = drawHeader(page);
  };

  cursorY = drawHeader(page);

  const ensure = (needed: number) => {
    if (cursorY - needed < MARGIN + 30) newPage();
  };

  const drawText = (text: string, f: PDFFont, size: number, color: RGB, gap = 4) => {
    const lines = wrap(text, f, size, contentW);
    for (const ln of lines) {
      ensure(size + gap);
      page.drawText(ln, { x: MARGIN, y: cursorY - size, font: f, size, color });
      cursorY -= size + gap;
    }
  };

  type Word = { text: string; bold: boolean; w: number };

  const runsToWords = (
    runs: { text: string; bold?: boolean }[],
    size: number
  ): Word[] => {
    const words: Word[] = [];
    for (const r of runs) {
      const f = r.bold ? bold : font;
      const parts = r.text.split(/(\s+)/);
      for (const p of parts) {
        if (!p) continue;
        if (/^\s+$/.test(p)) continue;
        words.push({ text: p, bold: !!r.bold, w: f.widthOfTextAtSize(p, size) });
      }
    }
    return words;
  };

  const spaceW = (boldFont: boolean, size: number) =>
    (boldFont ? bold : font).widthOfTextAtSize(" ", size);

  const wrapWords = (words: Word[], size: number, maxWidth: number): Word[][] => {
    const lines: Word[][] = [];
    let cur: Word[] = [];
    let curW = 0;
    for (const w of words) {
      const sp = cur.length ? spaceW(w.bold, size) : 0;
      if (cur.length && curW + sp + w.w > maxWidth) {
        lines.push(cur);
        cur = [w];
        curW = w.w;
      } else {
        cur.push(w);
        curW += sp + w.w;
      }
    }
    if (cur.length) lines.push(cur);
    return lines;
  };

  const drawRunsJustified = (
    runs: { text: string; bold?: boolean }[],
    size: number,
    color: RGB,
    gap: number
  ) => {
    const words = runsToWords(runs, size);
    if (!words.length) return;
    const lines = wrapWords(words, size, contentW);
    lines.forEach((lineWords, idx) => {
      ensure(size + gap);
      const isLast = idx === lines.length - 1;
      const wordsW = lineWords.reduce((a, w) => a + w.w, 0);
      const gaps = lineWords.length - 1;
      const baseSpace = spaceW(false, size);
      let spacing = baseSpace;
      if (!isLast && gaps > 0) {
        const remaining = contentW - wordsW;
        spacing = remaining / gaps;
        // sanity: don't blow out spacing absurdly on near-empty lines
        if (spacing > baseSpace * 4) spacing = baseSpace;
      }
      let x = MARGIN;
      lineWords.forEach((w, i) => {
        page.drawText(w.text, {
          x,
          y: cursorY - size,
          font: w.bold ? bold : font,
          size,
          color,
        });
        x += w.w + (i < gaps ? spacing : 0);
      });
      cursorY -= size + gap;
    });
  };

  const drawRunsLeft = (
    runs: { text: string; bold?: boolean }[],
    size: number,
    color: RGB,
    gap: number,
    leftIndent = 0,
    firstPrefix = "",
    contPrefix = ""
  ) => {
    const words = runsToWords(runs, size);
    if (!words.length) return;
    const maxW = contentW - leftIndent;
    const lines = wrapWords(words, size, maxW);
    lines.forEach((lineWords, idx) => {
      ensure(size + gap);
      const prefix = idx === 0 ? firstPrefix : contPrefix;
      let x = MARGIN + leftIndent;
      if (prefix) {
        page.drawText(prefix, { x, y: cursorY - size, font, size, color });
        x += font.widthOfTextAtSize(prefix, size);
      }
      lineWords.forEach((w, i) => {
        page.drawText(w.text, {
          x,
          y: cursorY - size,
          font: w.bold ? bold : font,
          size,
          color,
        });
        x += w.w + (i < lineWords.length - 1 ? spaceW(w.bold, size) : 0);
      });
      cursorY -= size + gap;
    });
  };

  // Title
  drawText(template.title, bold, 18, ink, 6);
  if (template.subtitle) drawText(template.subtitle, font, 11, muted, 8);
  cursorY -= 8;

  // Body
  for (const block of template.body) {
    if (block.kind === "p") {
      const runs = block.runs && block.runs.length ? block.runs : [{ text: block.text }];
      drawRunsJustified(runs, 11, ink, 4);
      cursorY -= 6;
    } else if (block.kind === "h") {
      cursorY -= 4;
      drawText(block.text, bold, 13, ink, 5);
    } else if (block.kind === "list") {
      block.items.forEach((item, i) => {
        const runs = block.itemRuns?.[i] && block.itemRuns[i].length
          ? block.itemRuns[i]
          : [{ text: item }];
        drawRunsLeft(runs, 11, ink, 4, 16, "•  ", "   ");
      });
      cursorY -= 4;
    } else if (block.kind === "spacer") {
      cursorY -= 12;
    }
  }


  // Signatures
  const sigs = template.signatures || defaultSignatures(company);
  ensure(80);
  cursorY -= 30;
  const sigW = (contentW - 30) / Math.max(sigs.length, 1);
  sigs.forEach((s, i) => {
    const x = MARGIN + i * (sigW + 30);
    page.drawRectangle({ x, y: cursorY, width: sigW, height: 0.7, color: ink });
    page.drawText(s.label, { x, y: cursorY - 12, font, size: 9, color: muted });
    if (s.name) page.drawText(s.name, { x, y: cursorY + 6, font, size: 10, color: ink });
  });

  // Footers w/ page counts
  const pages = pdf.getPages();
  pages.forEach((p, idx) => drawFooter(p, idx + 1, pages.length));

  return pdf.save();
}
