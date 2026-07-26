// Shows a warning at the top of the admin pages when the last automatic check
// of the LIVE app found something not working. Stays quiet when all is well.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

type Row = { status: string; label: string; run_id: string; checked_at: string };

export default function LiveHealthBanner() {
  const [down, setDown] = useState<Row[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("service_health_checks")
        .select("status, label, run_id, checked_at")
        .order("checked_at", { ascending: false })
        .limit(200);
      const all = (data || []) as Row[];
      if (all.length === 0) return;
      const latest = all.filter((r) => r.run_id === all[0].run_id);
      setCheckedAt(all[0].checked_at);
      setDown(latest.filter((r) => r.status !== "up"));
    })();
  }, []);

  if (down.length === 0) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div className="text-sm">
        <p className="font-medium text-destructive">
          {down.length} part{down.length === 1 ? "" : "s"} of the live app {down.length === 1 ? "is" : "are"} not working.
        </p>
        <p className="text-destructive/90">
          {down.slice(0, 4).map((d) => d.label).join(", ")}
          {down.length > 4 ? ` and ${down.length - 4} more` : ""}.
          {checkedAt ? ` Checked ${new Date(checkedAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}.` : ""}
        </p>
        <Link to="/admin/health" className="font-medium underline">
          Open live app health
        </Link>
      </div>
    </div>
  );
}
