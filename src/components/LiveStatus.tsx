import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { formatRelative } from "@/hooks/useLiveData";

export default function LiveStatus({
  updatedAt,
  refreshing,
  onRefresh,
}: {
  updatedAt: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  // Re-render every 15s so "12s ago" ticks upward.
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Updated {formatRelative(updatedAt)} · refreshes automatically</span>
      <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
