import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Severity = "critical" | "high" | "medium" | "low";

type Scan = {
  id: string;
  trigger_type: string;
  triggered_by_email: string | null;
  started_at: string;
  finished_at: string | null;
  status: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_count: number;
};

type Finding = {
  id: string;
  scan_id: string;
  rule_id: string;
  severity: Severity;
  title: string;
  description: string;
  affected_object: string | null;
  remediation: string | null;
  state: string;
  ignored_reason: string | null;
};

const sevLabel: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const sevClass: Record<Severity, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white dark:bg-orange-600",
  medium: "bg-yellow-500 text-black dark:bg-yellow-600 dark:text-white",
  low: "bg-muted text-muted-foreground",
};

export default function SecurityTab() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: s } = await supabase
      .from("security_scans")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30);
    const list = (s as Scan[]) ?? [];
    setScans(list);
    const pick = selectedId ?? list[0]?.id ?? null;
    setSelectedId(pick);
    if (pick) {
      const { data: f } = await supabase
        .from("security_findings")
        .select("*")
        .eq("scan_id", pick)
        .order("severity");
      setFindings((f as Finding[]) ?? []);
    } else {
      setFindings([]);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("run-security-scan", { body: {} });
      if (error) throw error;
      toast.success("Scan complete");
      setSelectedId(null);
      await load();
    } catch (e) {
      toast.error("Scan failed: " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const copyForLovable = async (f: Finding) => {
    const txt =
      `Please fix security finding ${f.rule_id} (${sevLabel[f.severity]}):\n` +
      `${f.title}\n\n${f.description}\n\n` +
      (f.affected_object ? `Affected: ${f.affected_object}\n` : "") +
      (f.remediation ? `Suggested fix: ${f.remediation}\n` : "");
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Copied — paste into Lovable chat");
    } catch {
      toast.error("Could not copy");
    }
  };

  const ignoreFinding = async (f: Finding) => {
    const reason = window.prompt("Why are you ignoring this finding?");
    if (!reason) return;
    const { error } = await supabase
      .from("security_findings")
      .update({ state: "ignored", ignored_reason: reason, ignored_at: new Date().toISOString() })
      .eq("id", f.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as ignored");
    setFindings((prev) => prev.map((x) => x.id === f.id ? { ...x, state: "ignored", ignored_reason: reason } : x));
  };

  const current = useMemo(() => scans.find((s) => s.id === selectedId), [scans, selectedId]);
  const openFindings = findings.filter((f) => f.state === "open");
  const ignoredFindings = findings.filter((f) => f.state === "ignored");

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Latest scan</h2>
            <p className="text-xs text-muted-foreground">
              {current
                ? `${new Date(current.started_at).toLocaleString()} · ${current.trigger_type} · ${current.triggered_by_email ?? "system"}`
                : "No scans yet. Click Run scan now."}
            </p>
          </div>
          <Button onClick={runScan} disabled={running}>
            {running ? "Scanning…" : "Run scan now"}
          </Button>
        </div>
        {current && (
          <div className="mt-3 flex flex-wrap gap-2">
            <SevPill sev="critical" n={current.critical_count} />
            <SevPill sev="high" n={current.high_count} />
            <SevPill sev="medium" n={current.medium_count} />
            <SevPill sev="low" n={current.low_count} />
            <Badge variant={current.total_count === 0 ? "secondary" : "outline"} className="ml-auto">
              {current.total_count === 0 ? "✅ All clear" : "⚠️ Action needed"}
            </Badge>
          </div>
        )}
      </div>

      {/* Findings */}
      <section>
        <h3 className="font-semibold mb-2">
          Findings {current ? `for scan on ${new Date(current.started_at).toLocaleString()}` : ""}
        </h3>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No findings recorded for this scan. 🎉</p>
        ) : (
          <div className="space-y-2">
            {openFindings.map((f) => (
              <FindingRow key={f.id} f={f} onCopy={copyForLovable} onIgnore={ignoreFinding} />
            ))}
            {ignoredFindings.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Ignored ({ignoredFindings.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {ignoredFindings.map((f) => (
                    <FindingRow key={f.id} f={f} onCopy={copyForLovable} onIgnore={ignoreFinding} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h3 className="font-semibold mb-2">Scan history</h3>
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-2">Date</th>
                  <th className="p-2">Trigger</th>
                  <th className="p-2 text-right">Critical</th>
                  <th className="p-2 text-right">High</th>
                  <th className="p-2 text-right">Medium</th>
                  <th className="p-2 text-right">Low</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`border-b cursor-pointer hover:bg-muted/50 ${s.id === selectedId ? "bg-muted/40" : ""}`}
                  >
                    <td className="p-2">{new Date(s.started_at).toLocaleString()}</td>
                    <td className="p-2 capitalize">{s.trigger_type}</td>
                    <td className="p-2 text-right">{s.critical_count}</td>
                    <td className="p-2 text-right">{s.high_count}</td>
                    <td className="p-2 text-right">{s.medium_count}</td>
                    <td className="p-2 text-right">{s.low_count}</td>
                    <td className="p-2 text-right font-medium">{s.total_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SevPill({ sev, n }: { sev: Severity; n: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sevClass[sev]}`}>
      {sevLabel[sev]} · {n}
    </span>
  );
}

function FindingRow({
  f, onCopy, onIgnore,
}: { f: Finding; onCopy: (f: Finding) => void; onIgnore: (f: Finding) => void }) {
  return (
    <div className="rounded border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sevClass[f.severity]}`}>
            {sevLabel[f.severity]}
          </span>
          <span className="font-medium">{f.title}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onCopy(f)}>Copy for Lovable</Button>
          {f.state === "open" && (
            <Button size="sm" variant="ghost" onClick={() => onIgnore(f)}>Ignore</Button>
          )}
        </div>
      </div>
      <div className="mt-1 text-muted-foreground">{f.description}</div>
      {f.affected_object && (
        <div className="mt-1 font-mono text-xs">Affected: {f.affected_object}</div>
      )}
      {f.remediation && (
        <div className="mt-1 text-xs"><b>Suggested fix:</b> {f.remediation}</div>
      )}
      {f.state === "ignored" && f.ignored_reason && (
        <div className="mt-1 text-xs italic">Ignored: {f.ignored_reason}</div>
      )}
    </div>
  );
}
