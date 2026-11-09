import { INDUSTRIES } from "@/lib/industryMatch";
import { Label } from "@/components/ui/label";

export function IndustrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="field-industry">Industry</Label>
      <select
        id="field-industry"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-14 w-full rounded-md border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Choose your industry (optional)</option>
        {INDUSTRIES.map((industry) => <option key={industry.value} value={industry.value}>{industry.label}</option>)}
      </select>
      <p className="mt-1 text-xs text-muted-foreground">CARA uses this to give advice for your industry's rules.</p>
    </div>
  );
}
