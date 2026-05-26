import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () =>
  (typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches) ||
  // @ts-expect-error iOS Safari
  (typeof window !== "undefined" && window.navigator?.standalone === true);

const InstallAppButton = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return true;
    return localStorage.getItem("inreco.pwaInstalled") === "1";
  });
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
      try {
        localStorage.setItem("inreco.pwaInstalled", "1");
      } catch (_) {}
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          try {
            localStorage.setItem("inreco.pwaInstalled", "1");
          } catch (_) {}
          setInstalled(true);
        }
      } catch (_) {}
      setDeferred(null);
    } else {
      setShowFallback(true);
    }
  };

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const fallbackMsg = isIOS
    ? "On iPhone/iPad: tap the Share icon, then Add to Home Screen."
    : isAndroid
      ? "Open your browser menu (⋮) and tap Install app or Add to Home screen."
      : "In your browser menu, choose Install app to add iNRECO to your device.";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
      >
        <img src="/favicon.png" alt="" width={20} height={20} className="rounded" />
        Install iNRECO on your device
      </button>
      {showFallback && (
        <p className="max-w-sm text-xs text-muted-foreground">{fallbackMsg}</p>
      )}
    </div>
  );
};

export default InstallAppButton;
