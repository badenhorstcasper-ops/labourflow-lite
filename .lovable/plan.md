## Root cause (confirmed by your screenshots)

`src/index.css` and `index.html` both declare design tokens on `:root` using the **same names** — `--primary`, `--border`, `--accent`, `--muted`, `--background`, `--foreground`, `--secondary`, `--destructive`, `--ring`, `--input`, `--radius`.

- `index.html` (legacy app shell — chat, signup, login, onboarding, plans) stores **hex** values and uses them raw: `background: var(--primary)`.
- `src/index.css` (shadcn) stores **HSL triplets** like `222.2 47.4% 11.2%` meant for `hsl(var(--primary))`.

`src/main.tsx` does `import "./index.css"` unconditionally, so Vite injects the shadcn stylesheet on **every** page — including the legacy app screens, where React never mounts. Same selector, later in source order ⇒ shadcn wins. The legacy CSS then resolves `var(--primary)` to the string `"222.2 47.4% 11.2%"`, which is invalid for `background`/`color`/`border-color`, so:

- Chat bubbles lose their `--surface` / `--primary` background and inherit the body navy.
- Bubble text loses the explicit `#fff` (user) or inherited `--text` and falls back to dark.
- The "💡 Tip" box, the "Was CARA helpful?" share banner, follow-up chips, and primary buttons all collapse the same way.

This matches every screenshot you sent — chat, signup, plans, onboarding all show dark-on-dark text and washed-out buttons. The React account/documents pages look fine because they use the shadcn tokens *as intended*.

## Fix

Two small, surgical changes — no visual redesign, no class renaming, no token chasing.

### 1. `src/main.tsx` — don't ship the React stylesheet to legacy app routes

Replace the top-level `import "./index.css"` with a dynamic import inside the existing `shouldMountReact` branch and make the bootstrap async:

```ts
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const REACT_ROUTES = ["/d/", "/account-app", "/share/"];
const shouldMountReact = (p: string) =>
  REACT_ROUTES.some((r) => p === r || p.startsWith(r));

if (shouldMountReact(window.location.pathname)) {
  void (async () => {
    await import("./index.css");
    document.body.innerHTML = '<div id="root"></div>';
    createRoot(document.getElementById("root")!).render(
      <StrictMode><App /></StrictMode>,
    );
  })();
}
```

Effect: on `/`, `/auth`, the chat screen, signup, plans — no shadcn variables get injected, so `index.html`'s hex tokens win and the legacy app renders exactly as its CSS was written.

### 2. `src/index.css` — scope shadcn tokens to the React subtree (defense-in-depth)

Even on React routes the legacy `<style>` block stays in the document until `document.body.innerHTML` is overwritten. Move the shadcn definitions off bare `:root` so the names can never collide again:

```css
@layer base {
  :root,
  #root {
    /* existing shadcn light tokens */
  }
  .dark,
  #root.dark {
    /* existing shadcn dark tokens */
  }
}
```

Keeps current behavior intact on React pages; guarantees that if these two stylesheets ever co-exist in the same document, the legacy hex tokens are not silently overwritten.

## Verification

On `/` and inside the chat screen after signup:
- `getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()` returns `#2563eb`, not `222.2 47.4% 11.2%`.
- Bot bubble: dark surface background, light text. User bubble: blue (`--primary`) background, white text.
- 💡 Tip box: muted light text on `--surface-2`.
- "Was CARA helpful?" banner: light text, visible green Share button, visible Dismiss outline.
- Signup / login / onboarding primary buttons: blue background, white label.

On `/account-app/profile` and `/account-app/documents`:
- shadcn Button/Card/Input render unchanged from today.

Re-screenshot the chat screen and one React account page after the change to confirm both paths look right.

## Files touched

```text
src/main.tsx   — gate index.css behind shouldMountReact via dynamic import
src/index.css  — add #root to the :root / .dark selectors
```

## Out of scope

- Visual redesign, spacing, typography.
- Further `text-white` / `text-slate-*` sweeps in components — already done; the real bug is the variable collision.
- `ContrastAudit` dev overlay stays as-is.
