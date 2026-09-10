import React from "react";

/**
 * Lazy-load a screen. If the browser is holding an outdated copy of the app
 * (which happens right after a new version is published), the file it asks for
 * no longer exists and the screen fails to open. In that case we refresh the
 * page once so the browser picks up the new version.
 */
const RELOAD_KEY = "inreco:chunk-reload";

export function lazyWithRetry<T extends React.ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const mod = await factory();
      try {
        window.sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
      return mod;
    } catch (err) {
      let alreadyTried = false;
      try {
        alreadyTried = window.sessionStorage.getItem(RELOAD_KEY) === "1";
        window.sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        /* ignore */
      }
      if (!alreadyTried) {
        // Drop any cached copies of the old version, then reload.
        try {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch {
          /* ignore */
        }
        window.location.reload();
        // Keep Suspense pending while the page reloads.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
