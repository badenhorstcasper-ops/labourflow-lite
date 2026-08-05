import { Link, useLocation } from "react-router-dom";
import { MessageCircle, LayoutGrid, FilePlus2, FolderOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ElementType };

const items: Item[] = [
  { to: "/app", label: "CARA", icon: MessageCircle },
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/account-app/generate", label: "Create", icon: FilePlus2 },
  { to: "/account-app/documents", label: "Docs", icon: FolderOpen },
];

export default function BottomNav({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-6 w-6 transition-transform", active && "scale-110")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onMore}
            aria-label="More options"
            className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreHorizontal className="h-6 w-6" />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
