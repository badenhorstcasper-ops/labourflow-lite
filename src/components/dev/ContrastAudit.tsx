/**
 * ContrastAudit — dev-only overlay that scans the live DOM for WCAG AA
 * contrast violations and highlights the offending elements.
 *
 * Toggle with the floating button (bottom-right) or Alt+Shift+C.
 * Mounted only in dev (import.meta.env.DEV).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RGBA = { r: number; g: number; b: number; a: number };
type Issue = {
  el: HTMLElement;
  text: string;
  ratio: number;
  required: number;
  fg: string;
  bg: string;
  isLarge: boolean;
};

const HIGHLIGHT_CLASS = "__contrast-audit-fail";
const STYLE_TAG_ID = "__contrast-audit-style";

function parseColor(input: string): RGBA | null {
  if (!input) return null;
  const m = input
    .replace(/\s+/g, "")
    .match(/^rgba?\((\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d*\.?\d+))?\)$/i);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] != null ? +m[4] : 1 };
}

function blend(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a),
    g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a),
    b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a),
    a,
  };
}

/** Walk up ancestors compositing each non-transparent background. */
function effectiveBackground(el: HTMLElement): RGBA {
  let acc: RGBA = { r: 255, g: 255, b: 255, a: 1 };
  const chain: RGBA[] = [];
  let cur: HTMLElement | null = el;
  while (cur) {
    const c = parseColor(getComputedStyle(cur).backgroundColor);
    if (c && c.a > 0) chain.push(c);
    cur = cur.parentElement;
  }
  // Composite from bottom (root) up to the element.
  for (let i = chain.length - 1; i >= 0; i--) {
    acc = blend(chain[i], acc);
  }
  return acc;
}

function relLum({ r, g, b }: RGBA): number {
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(a: RGBA, b: RGBA): number {
  const l1 = relLum(a);
  const l2 = relLum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function isLargeText(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  const px = parseFloat(cs.fontSize);
  const weight = parseInt(cs.fontWeight, 10) || 400;
  // WCAG: >= 18pt (24px) regular, or >= 14pt (18.66px) bold.
  return px >= 24 || (px >= 18.66 && weight >= 700);
}

function visibleText(el: HTMLElement): string {
  let txt = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      txt += node.textContent ?? "";
    }
  }
  return txt.trim();
}

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function rgbaToStr(c: RGBA): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${Number(c.a.toFixed(2))})`;
}

function audit(root: HTMLElement): Issue[] {
  const issues: Issue[] = [];
  const all = root.querySelectorAll<HTMLElement>("*");
  for (const el of Array.from(all)) {
    if (el.closest("[data-contrast-audit-ui]")) continue;
    if (!isVisible(el)) continue;
    const text = visibleText(el);
    if (!text) continue;

    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg || fg.a === 0) continue;
    const bg = effectiveBackground(el);

    // Composite fg over effective bg in case fg has alpha.
    const fgEff = fg.a < 1 ? blend(fg, bg) : fg;

    const ratio = contrastRatio(fgEff, bg);
    const large = isLargeText(el);
    const required = large ? 3 : 4.5;
    if (ratio < required) {
      issues.push({
        el,
        text: text.slice(0, 80),
        ratio: Math.round(ratio * 100) / 100,
        required,
        fg: rgbaToStr(fgEff),
        bg: rgbaToStr(bg),
        isLarge: large,
      });
    }
  }
  return issues;
}

function ensureStyleTag() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px dashed #ff2d55 !important;
      outline-offset: 2px !important;
      background-image:
        repeating-linear-gradient(45deg, rgba(255,45,85,0.08) 0 6px, transparent 6px 12px) !important;
    }
    .${HIGHLIGHT_CLASS}::after {
      content: attr(data-contrast-label);
      position: absolute;
      transform: translate(0, -100%);
      background: #ff2d55;
      color: #fff;
      font: 600 10px/1.2 ui-sans-serif, system-ui, sans-serif;
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 2147483646;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

function clearHighlights() {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((n) => {
    n.classList.remove(HIGHLIGHT_CLASS);
    (n as HTMLElement).removeAttribute("data-contrast-label");
  });
}

function paintHighlights(issues: Issue[]) {
  clearHighlights();
  for (const i of issues) {
    i.el.classList.add(HIGHLIGHT_CLASS);
    i.el.setAttribute("data-contrast-label", `${i.ratio}:1 (need ${i.required}:1)`);
  }
}

export default function ContrastAudit() {
  const [enabled, setEnabled] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const rerunTimer = useRef<number | null>(null);

  const run = useCallback(() => {
    ensureStyleTag();
    const found = audit(document.body);
    setIssues(found);
    paintHighlights(found);
  }, []);

  // Re-audit on DOM changes while enabled.
  useEffect(() => {
    if (!enabled) {
      clearHighlights();
      setIssues([]);
      setSelected(null);
      return;
    }
    run();
    const mo = new MutationObserver(() => {
      if (rerunTimer.current) window.clearTimeout(rerunTimer.current);
      rerunTimer.current = window.setTimeout(run, 250);
    });
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => {
      mo.disconnect();
      if (rerunTimer.current) window.clearTimeout(rerunTimer.current);
      clearHighlights();
    };
  }, [enabled, run]);

  // Alt+Shift+C toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        setEnabled((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const summary = useMemo(() => {
    const fail = issues.length;
    const large = issues.filter((i) => i.isLarge).length;
    return { fail, normal: fail - large, large };
  }, [issues]);

  return (
    <div data-contrast-audit-ui style={{ position: "fixed", inset: "auto 12px 12px auto", zIndex: 2147483647 }}>
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        title="Toggle contrast audit (Alt+Shift+C)"
        style={{
          background: enabled ? "#ff2d55" : "#111827",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 999,
          padding: "8px 14px",
          font: "600 12px/1 ui-sans-serif, system-ui, sans-serif",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        {enabled ? `Contrast: ${summary.fail} fail` : "Run contrast audit"}
      </button>

      {enabled && (
        <div
          style={{
            marginTop: 8,
            width: 340,
            maxHeight: "60vh",
            overflow: "auto",
            background: "#0f172a",
            color: "#f1f5f9",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 12,
            font: "12px/1.4 ui-sans-serif, system-ui, sans-serif",
            boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>WCAG AA contrast</strong>
            <button
              type="button"
              onClick={run}
              style={{
                background: "transparent",
                color: "#93c5fd",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "2px 8px",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Re-scan
            </button>
          </div>
          <div style={{ color: "#94a3b8", marginBottom: 8 }}>
            {summary.fail === 0
              ? "No contrast failures detected."
              : `${summary.fail} failing element${summary.fail === 1 ? "" : "s"} (${summary.normal} normal, ${summary.large} large)`}
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {issues.slice(0, 50).map((i, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onMouseEnter={() => setSelected(idx)}
                  onMouseLeave={() => setSelected(null)}
                  onClick={() => {
                    i.el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: selected === idx ? "#1e293b" : "transparent",
                    color: "#f1f5f9",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    padding: 8,
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "#fca5a5" }}>{i.ratio}:1</span>
                    <span style={{ color: "#94a3b8" }}>need {i.required}:1{i.isLarge ? " (large)" : ""}</span>
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#e2e8f0",
                    }}
                  >
                    {i.text || <em style={{ color: "#64748b" }}>(no text)</em>}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      color: "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: i.fg, border: "1px solid #334155" }} />
                    fg
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: i.bg, border: "1px solid #334155", marginLeft: 6 }} />
                    bg
                    <span style={{ marginLeft: "auto", color: "#64748b" }}>{i.el.tagName.toLowerCase()}</span>
                  </div>
                </button>
              </li>
            ))}
            {issues.length > 50 && (
              <li style={{ color: "#64748b", textAlign: "center", padding: 4 }}>
                + {issues.length - 50} more…
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}
