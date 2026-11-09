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
        <option value="restaurant">Restaurant, fast food or catering</option>
        <option value="retail">Retail or supermarket</option>
        <option value="other">Other</option>
      </select>
      <p className="mt-1 text-xs text-muted-foreground">CARA uses this to give advice for your industry's rules.</p>
    </div>
  );
}
