# Fix: "Sign in" error when generating PDF / Word from the legacy app

## What's actually going wrong

You ARE signed in — but to the **old** backend. The app currently talks to two different databases:

- **Legacy app** (the main screens at `/`, including the wizard that builds the warning letter) signs you in to project `ckjevliuwlijfvdjxmmp`.
- **New React document generator** (the shared house-style PDF/DOCX renderer wired into `window.iNRECO.generatePdf`) talks to the **Lovable Cloud** project `riqswihuzclbyjemynyd`, where you have no session.

So when the legacy "Download PDF / Word" button calls into the new renderer, the renderer asks Cloud "who is signed in?", gets nothing back, and throws `not_signed_in` — which surfaces to you as "you should be signed in".

The network log confirms it: every `auth/v1/user` and `company_profiles` request goes to `ckje…`, never to `riqs…`.

## The fix (one file)

The legacy app already owns its own company profile, doc numbering, and storage on the old backend. The shared renderer should just **render and download** — it should not try to look anything up on Cloud, and it should not require a Cloud session.

Change `src/lib/documents/clientEntry.ts` so that:

1. `loadCompanyProfile()` no longer throws when there's no Cloud session. It tries Cloud best-effort, and on any miss falls back to safe defaults (company name from the legacy app if exposed on `window.iNRECO`, otherwise "Your company").
2. `nextDocNumber()` skips the Cloud RPC entirely when there's no session and uses the existing local timestamp fallback (`DOC-YYYYMMDDhhmm`).
3. No DB writes, no storage uploads from this path — the legacy app keeps owning its own "documents" list. The React `/account-app/documents` shelf is unaffected.

Net effect: clicking **Download PDF** or **Download Word** on a final warning (or any wizard output) just produces the branded file and downloads it. No sign-in prompt, no error.

## Out of scope (call out only)

- Migrating the legacy app off `ckje…` onto Lovable Cloud is a much bigger job and not needed to unblock document downloads.
- The new React `/account-app/documents` shelf already works correctly for users signed in to Cloud — it's not changed here.

## Files touched

- `src/lib/documents/clientEntry.ts` — remove the hard auth requirement; keep Cloud calls best-effort; always fall through to local defaults so the download always works.

Approve this and I'll make the change, then you can retry generating a final warning.
