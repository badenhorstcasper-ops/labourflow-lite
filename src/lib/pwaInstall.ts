// Captures the browser's "you can install this app" moment as early as
// possible (it usually fires before React finishes loading) and registers the
// small background helper file the browser needs before it will offer a
// one-tap install.

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Store = {
  event: InstallPromptEvent | null;
  installed: boolean;
  listeners: Set<() => void>;
};

declare global {
  interface Window {
    __inrecoInstall?: Store;
  }
}

function getStore(): Store {
  if (!window.__inrecoInstall) {
    window.__inrecoInstall = { event: null, installed: false, listeners: new Set() };
  }
  return window.__inrecoInstall;
}

function notify(store: Store) {
  store.listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function getInstallPrompt(): InstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return getStore().event;
}

export function subscribeInstall(fn: () => void): () => void {
  const store = getStore();
  store.listeners.add(fn);
  return () => store.listeners.delete(fn);
}

export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const store = getStore();
  const evt = store.event;
  if (!evt) return "unavailable";
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    store.event = null;
    if (outcome === "accepted") store.installed = true;
    notify(store);
    return outcome;
  } catch {
    store.event = null;
    notify(store);
    return "unavailable";
  }
}

export function initPwaInstall() {
  if (typeof window === "undefined") return;
  const store = getStore();
  if ((store as Store & { started?: boolean }).started) return;
  (store as Store & { started?: boolean }).started = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    store.event = e as InstallPromptEvent;
    notify(store);
  });
  window.addEventListener("appinstalled", () => {
    store.event = null;
    store.installed = true;
    try {
      localStorage.setItem("inreco.pwaInstalled", "1");
    } catch {
      /* ignore */
    }
    notify(store);
  });

  // The legacy home page already stashed an early event before React loaded.
  const legacy = (window as unknown as { deferredInstallPrompt?: InstallPromptEvent })
    .deferredInstallPrompt;
  if (legacy && !store.event) store.event = legacy;

  const isPreviewHost = /id-preview--|preview--|lovableproject\.com|lovableproject-dev\.com/.test(
    window.location.hostname,
  );
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  if ("serviceWorker" in navigator && !isPreviewHost && !inIframe) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}
