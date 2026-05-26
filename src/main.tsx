import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The legacy vanilla app owns the document body and renders into existing
// markup in index.html. React only takes over for specific app routes
// (the new account / documents / share-link surfaces).
const REACT_ROUTES = ["/d/", "/account-app", "/share/"];

function shouldMountReact(pathname: string) {
  return REACT_ROUTES.some((p) => pathname === p || pathname.startsWith(p));
}

if (shouldMountReact(window.location.pathname)) {
  // Hide whatever the legacy app rendered and mount React in its place.
  document.body.innerHTML = '<div id="root"></div>';
  const rootEl = document.getElementById("root")!;
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
