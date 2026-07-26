import { useEffect, useState } from "react";
import {
  getInstallPrompt,
  isStandalone,
  subscribeInstall,
  triggerInstall,
} from "@/lib/pwaInstall";

const InstallAppButton = () => {
  const [canInstall, setCanInstall] = useState(() => !!getInstallPrompt());
  const [installed, setInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return true;
    return localStorage.getItem("inreco.pwaInstalled") === "1";
  });
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const sync = () => {
      setCanInstall(!!getInstallPrompt());
      if (isStandalone() || localStorage.getItem("inreco.pwaInstalled") === "1") {
        setInstalled(true);
      }
    };
    sync();
    return subscribeInstall(sync);
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    const result = await triggerInstall();
    if (result === "accepted") {
      try {
        localStorage.setItem("inreco.pwaInstalled", "1");
      } catch (_) {}
      setInstalled(true);
      return;
    }
    if (result === "unavailable") setShowFallback(true);
  };

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const fallbackMsg = isIOS
    ? "On iPhone/iPad: tap the Share icon, then Add to Home Screen."
    : isAndroid
      ? "Open your browser menu (⋮) and tap Install app or Add to Home screen."
      : "In your browser menu, choose Install app to add iNRECO to your device.";

  // iPhone/iPad browsers never offer a one-tap install, so show the short
  // steps straight away instead of a button that cannot do anything.
  if (isIOS) {
    return (
      <p className="max-w-sm text-center text-xs text-muted-foreground">{fallbackMsg}</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
      >
        <img src="/icon-192.png" alt="" width={20} height={20} className="rounded" />
        Install iNRECO on your device
      </button>
      {!canInstall && showFallback && (
        <p className="max-w-sm text-xs text-muted-foreground">{fallbackMsg}</p>
      )}
    </div>
  );
};

export default InstallAppButton;
