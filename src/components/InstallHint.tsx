import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Share, Plus, MoreVertical, Download } from "lucide-react";

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Windows|Linux/.test(ua)) return "desktop";
  return "other";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const DISMISS_KEY = "inreco.installHintDismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallHint = () => {
  const [platform, setPlatform] = useState<Platform>("other");
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    setPlatform(detectPlatform());
    setVisible(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const triggerInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  return (
    <Card className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border-primary/20 shadow-lg sm:inset-x-auto sm:right-4">
      <CardContent className="relative space-y-3 p-4 pr-10">
        <button
          onClick={dismiss}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-sm font-semibold">Install iNRECO on your device</h3>

        {platform === "ios" && (
          <p className="text-xs text-muted-foreground">
            In Safari, tap <Share className="inline h-3.5 w-3.5" /> <strong>Share</strong>, then{" "}
            <strong>Add to Home Screen</strong> <Plus className="inline h-3.5 w-3.5" />.
          </p>
        )}

        {platform === "android" && (
          <p className="text-xs text-muted-foreground">
            In Chrome, tap <MoreVertical className="inline h-3.5 w-3.5" /> <strong>menu</strong>,
            then <strong>Add to Home screen</strong> or <strong>Install app</strong>.
          </p>
        )}

        {(platform === "desktop" || platform === "other") && (
          <p className="text-xs text-muted-foreground">
            In Chrome or Edge, click the install icon{" "}
            <Download className="inline h-3.5 w-3.5" /> in the address bar, or open the browser
            menu and choose <strong>Install iNRECO</strong>.
          </p>
        )}

        {deferred && (
          <Button size="sm" onClick={triggerInstall} className="w-full">
            Install now
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default InstallHint;
