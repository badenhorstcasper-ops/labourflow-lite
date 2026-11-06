import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { countdownText, formatYmd, todaySAST } from "@/lib/ccma/deadlines";
import { listMatters, listUnreadReminders, withCountdown, type Matter } from "@/lib/ccma/matters";

/** Dashboard card: next open CCMA deadlines + unread in-app reminders. */
export default function CcmaDeadlinesCard() {
  const [next, setNext] = useState<ReturnType<typeof withCountdown>[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, r] = await Promise.all([listMatters(), listUnreadReminders().catch(() => [])]);
        if (!alive) return;
        const today = todaySAST();
        setNext(
          m.filter((x: Matter) => x.status === "open").map((x) => withCountdown(x, today))
            .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3),
        );
        setUnread(r.length);
      } catch { /* table not there yet / offline — show the empty state */ }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-soft text-teal"><CalendarClock className="h-5 w-5" /></span>
          CCMA deadlines
          {unread > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground" aria-label={`${unread} unread reminders`}>
              {unread}
            </span>
          )}
        </CardTitle>
        <Link to="/account-app/deadlines" className="text-sm text-muted-foreground underline">View all</Link>
      </CardHeader>
      <CardContent>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : next.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Track the 30-day dismissal referral window and other CCMA time limits, with reminders.</p>
            <Button asChild size="sm" variant="outline"><Link to="/account-app/deadlines">Add a deadline →</Link></Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {next.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-foreground">{m.title} <span className="text-muted-foreground">· {formatYmd(m.due_date)}</span></span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                  m.daysLeft <= 0 ? "bg-destructive text-destructive-foreground" : m.daysLeft <= 7 ? "bg-warning text-warning-foreground" : "bg-teal-soft text-teal")}>
                  {countdownText(m.daysLeft)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
