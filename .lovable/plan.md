# iNRECO — Pre-launch checklist

Public launch, sandbox PayFast for now (will swap to live keys later).

## 1. Fix routing (blocker)

`src/App.tsx` only registers `/account-app/*`, `/d/:token`, `/contact`, `/terms`, `/privacy`, `/disclaimer`. Everything else falls through to `*` → `/` and loops. Add:

| Path | Component |
|---|---|
| `/` | `pages/Index` (marketing/landing for app.inreco.co.za) |
| `/pricing` | `pages/Pricing` |
| `/auth` | `pages/Auth` |
| `/payment-success` | `pages/PaymentSuccess` |
| `/payment-cancelled` | `pages/PaymentCancelled` |
| `/dashboard` | `pages/Dashboard` |
| `/settings` | `pages/Settings` |
| `*` | `pages/NotFound` (instead of redirect-loop to `/`) |

## 2. Confirm Google sign-in is wired

Project rule says Google auth should be available. I'll verify `pages/Auth.tsx` uses `lovable.auth.signInWithOAuth("google", ...)` and that the Google provider is enabled in Cloud auth settings. Add the button if missing.

## 3. Verify auth hardening

- Confirm **leaked-password (HIBP) check** is ON (security memory says it is — I'll confirm).
- Confirm **anonymous sign-ups disabled**.
- Confirm **auto-confirm email** is the setting you actually want (off = users must click confirm link; on = instant access). Tell me which.

## 4. PayFast — sandbox-safe launch banner

Since we're going live with sandbox keys, real users will not be charged and accounts won't actually activate. To avoid confusion:

- Add a visible **"Payments are in test mode — no charges yet"** banner on `/pricing` and on the post-checkout pages.
- OR (recommended): hide the "Subscribe / Start trial" buttons behind an `import.meta.env.VITE_PAYFAST_LIVE` flag so you can flip them on the moment live keys arrive, without redeploying logic.

Tell me which you prefer.

## 5. Landing page for `app.inreco.co.za` (`/`)

Right now `/` isn't even routed. We need to decide what loads at the root of `app.inreco.co.za`:

- **Option A** — A short marketing page (hero + "View plans" + "Sign in") using `pages/Index.tsx`. Best UX for users arriving from `inrecoapp.inreco.co.za`.
- **Option B** — Auto-redirect `/` → `/pricing` for logged-out users and `/` → `/account-app/profile` for logged-in users.

I'll ask which when we start.

## 6. SEO + meta basics

For `/`, `/pricing`, `/auth`:
- Unique `<title>` (<60 chars) and meta description (<160 chars).
- Single `<h1>`, semantic sections.
- Open Graph image + canonical tag.
- `robots.txt` already exists — confirm it isn't blocking. Add `sitemap.xml` listing public routes.

## 7. PWA / install

`InstallAppButton` and `sw.js` exist. Quick check:
- Service worker excludes `/~oauth/*` (required for Google sign-in to work in installed PWA).
- `manifest.json` has correct name "iNRECO", icons, theme color.

## 8. Smoke-test pass before publish

End-to-end on `app.inreco.co.za` after deploy:

1. `/` loads
2. Sign up with email → confirm flow works → land on profile
3. Sign in with Google → land on profile
4. Fill company profile → generate a PDF and a DOCX → branding shows correctly
5. Open `/pricing`, click trial → PayFast sandbox page loads → return + cancel URLs work
6. Share a document via `/d/<token>` in incognito → opens, expires correctly
7. `/account-app/health` loads for you (admin) and is hidden/forbidden for a second test account
8. Trigger a fake error → confirm it lands in `error_logs` and shows on Health page

## 9. Post-launch (do NOT block launch, but track)

- Switch PayFast to live (URL + merchant ID + key + passphrase, NOTIFY_URL stays the same)
- Remove the "test mode" banner from step 4
- Re-run the webhook with a real R1 transaction to confirm activation flow

---

## What I need from you to start building

1. **Auto-confirm email** — on or off?
2. **PayFast sandbox UX** — banner, or hide subscribe buttons behind a flag?
3. **What lives at `/`** — short marketing page (Option A) or smart redirect (Option B)?

Once you answer those three, I'll switch to build mode and ship steps 1–7 in one pass, then walk the smoke test with you.
