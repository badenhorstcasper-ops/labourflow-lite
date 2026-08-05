import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPrompt,
  isStandalone,
  subscribeInstall,
  triggerInstall,
} from "@/lib/pwaInstall";

type Variant = "button" | "card" | "banner";

/**
 * One reusable "Install app" invitation. It disappears by itself once the
 * shortcut is on the device, uses the phone's own install prompt where the
 * browser supports it, and otherwise shows the short manual steps.
 */
export default function InstallCta({
  variant = "button",
  label = "Install the app",
  className = "",
}: {
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return true;
    if (isStandalone()) return true;
    try {
      return localStorage.getItem("inreco.pwaInstalled") === "1";
    } catch (_) {
      return false;
    }
  });
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (isStandalone() || localStorage.getItem("inreco.pwaInstalled") === "1") {
        setInstalled(true);
      }
    };
    sync();
    return subscribeInstall(sync);
  }, []);

  if (installed || dismissed) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const steps = isIOS
    ? "On iPhone or iPad: tap the Share icon at the bottom of Safari, then tap Add to Home Screen."
    : "Open your browser menu (⋮) and tap Install app or Add to Home screen.";

  const handleClick = async () => {
    if (isIOS || !getInstallPrompt()) {
      setShowSteps(true);
      return;
    }
    const result = await triggerInstall();
    if (result === "accepted") {
      try {
        localStorage.setItem("inreco.pwaInstalled", "1");
      } catch (_) {}
      setInstalled(true);
    } else if (result === "unavailable") {
      setShowSteps(true);
    }
  };

  const button = (
    <Button onClick={handleClick} className="w-full gap-2">
      <Download className="h-5 w-5" />
      {label}
    </Button>
  );

  if (variant === "button") {
    return (
      <div className={className}>
        {button}
        {showSteps && <p className="mt-2 text-xs text-muted-foreground">{steps}</p>}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className={`mb-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Add iNRECO to your phone</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Opens full screen like a normal app — no app store needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground underline"
          >
            Later
          </button>
        </div>
        <div className="mt-3">{button}</div>
        {showSteps && <p className="mt-2 text-xs text-muted-foreground">{steps}</p>}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border bg-card p-5 text-center ${className}`}>
      <img src="/icon-192.png" alt="" width={56} height={56} className="mx-auto rounded-2xl" />
      <p className="mt-3 text-base font-semibold">Install iNRECO on your device</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Free to install. No account, no plan and no card needed to add the shortcut.
      </p>
      <div className="mt-4">{button}</div>
      {showSteps && <p className="mt-2 text-xs text-muted-foreground">{steps}</p>}
    </div>
  );
}
