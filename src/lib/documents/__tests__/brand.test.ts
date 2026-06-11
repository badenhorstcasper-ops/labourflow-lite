import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const FORBIDDEN = [/pocketlabour/i, /inreco\s+consulting/i];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__") continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

describe("documents library brand safety", () => {
  it("contains no forbidden brand names", () => {
    const root = join(process.cwd(), "src/lib/documents");
    const files = walk(root);
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, "utf8");
      for (const re of FORBIDDEN) {
        if (re.test(content)) offenders.push(`${f} matches ${re}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
