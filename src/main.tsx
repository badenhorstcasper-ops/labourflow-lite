import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Side-effect import: exposes window.iNRECO.{generatePdf,generateDocx} so the
// legacy vanilla app in index.html can produce branded PDF / Word downloads.
import "./lib/documents/clientEntry";
import { installGlobalErrorHandlers } from "./lib/errorLogger";

// Install global error catchers for ALL routes (legacy vanilla + React).
installGlobalErrorHandlers();

// The legacy vanilla app owns the document body and renders into existing
// markup in index.html. React only takes over for specific app routes
// (the new account / documents / share-link surfaces).
//
// IMPORTANT: do NOT import "./index.css" at the top level. Its shadcn
// design tokens (`--primary`, `--border`, `--muted`, …) live on `:root`
// as raw HSL triplets and would otherwise clobber the legacy app's
// hex-valued tokens of the same name in index.html, breaking contrast
// across the chat / signup / onboarding / plans screens.
const REACT_ROUTES = ["/d/", "/account-app", "/share/", "/terms", "/privacy", "/disclaimer", "/pricing", "/auth", "/contact", "/payment-success", "/payment-cancelled", "/dashboard", "/settings", "/app", "/admin"];

function shouldMountReact(pathname: string) {
  return REACT_ROUTES.some((p) => pathname === p || pathname.startsWith(p));
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
  })();
}
