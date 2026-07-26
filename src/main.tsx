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
// The legacy marketing page owns ONLY the home address ("/"). React handles
// every other address, including unknown ones so the "page not found" screen
// can appear instead of the marketing page.
const LEGACY_ROUTES = ["/", "", "/index.html"];

function shouldMountReact(pathname: string) {
  return !LEGACY_ROUTES.includes(pathname);
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
