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
  // Chrome on Android builds an up-to-date home-screen app. Other Android
  // browsers build an older-style one, which makes Google show a scary
  // "unsafe app blocked" warning — so we nudge people to Chrome instead.
  const isChromeAndroid =
    isAndroid && /Chrome\//.test(ua) && !/(EdgA|OPR|SamsungBrowser|Brave|YaBrowser|UCBrowser|MiuiBrowser|Firefox)/.test(ua);
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
      {isAndroid && !isChromeAndroid && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          For the smoothest install, open <strong>app.inreco.co.za</strong> in Chrome first.
        </p>
      )}
      {isAndroid && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          If your phone shows a Google Play Protect warning, it's safe to tap{" "}
          <strong>Install anyway</strong> — or skip installing and just use iNRECO in your
          browser, which works exactly the same.
        </p>
      )}
      {!canInstall && showFallback && (
        <p className="max-w-sm text-xs text-muted-foreground">{fallbackMsg}</p>
      )}
    </div>
  );
};

export default InstallAppButton;
