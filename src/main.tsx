import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Side-effect import: exposes window.iNRECO.{generatePdf,generateDocx} so the
// legacy vanilla app in index.html can produce branded PDF / Word downloads.
import "./lib/documents/clientEntry";
import { installGlobalErrorHandlers } from "./lib/errorLogger";
import { initPwaInstall } from "./lib/pwaInstall";
import { isAppLaunch } from "./lib/appLaunch";

// Install global error catchers for ALL routes (legacy vanilla + React).
installGlobalErrorHandlers();
// Catch the browser's "installable" moment as early as possible.
initPwaInstall();


// The legacy vanilla app owns the document body and renders into existing
// markup in index.html. React only takes over for specific app routes
// (the new account / documents / share-link surfaces).
//
// IMPORTANT: do NOT import "./index.css" at the top level. Its shadcn
// design tokens (`--primary`, `--border`, `--muted`, …) live on `:root`
// as raw HSL triplets and would otherwise clobber the legacy app's
// hex-valued tokens of the same name in index.html, breaking contrast
// across the chat / signup / onboarding / plans screens.
// The legacy marketing page owns ONLY the home address ("/"). React handles
// every other address, including unknown ones so the "page not found" screen
// can appear instead of the marketing page.
const LEGACY_ROUTES = ["/", "", "/index.html", "/restaurants", "/supermarkets"];

// A password-reset (or other recovery) link from an email arrives at the home
// address with the one-time code attached. The marketing page must NOT swallow
// it, otherwise the person is silently signed in without ever choosing a new
// password. Detect it and send them to the "Set a new password" screen.
function isRecoveryLink() {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    /[?&]code=/.test(search)
  );
}

function shouldMountReact(pathname: string) {
  if (isRecoveryLink()) return true;
  // Someone who opened the installed shortcut must never land on the
  // marketing page — React takes over and sends them to the right screen.
  if (isAppLaunch()) return true;
  return !LEGACY_ROUTES.includes(pathname);
}

if (isRecoveryLink() && window.location.pathname !== "/reset-password") {
  window.history.replaceState(
    {},
    "",
    `/reset-password${window.location.search}${window.location.hash}`,
  );
}



if (shouldMountReact(window.location.pathname)) {
  void (async () => {
    await import("./index.css");
    // Hide whatever the legacy app rendered and mount React in its place.
    document.body.innerHTML = '<div id="root"></div>';
    const rootEl = document.getElementById("root")!;
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    // The shortcut launch keeps the page blank until now; show it again.
    document.documentElement.style.visibility = "";
  })();
} else {
  document.documentElement.style.visibility = "";
}
