# Make errors & security easy to handle

Goal: when something breaks or a security issue appears, you see it in one place, in plain English, with a one-click way to send it to Lovable to fix.

## 1. In-app error catcher

- Add a global error boundary around the React app so a crash shows a friendly screen ("Something went wrong — we've logged it") instead of a blank page.
- Catch unhandled JS errors and promise rejections in `index.html` and in the React tree.
- Each caught error is:
  - shown as a toast to you ("An error occurred — tap to view"),
  - written to a new `error_logs` table in Lovable Cloud (timestamp, user email, route, message, stack, browser),
  - and given a short **Error ID** you can copy.

## 2. "Report a problem" button

- Add a small "Report a problem" link in the footer / account menu.
- Opens a dialog with: what you were doing (free text), auto-attached last error + route + device info.
- Writes to a `bug_reports` table you can review later.

## 3. Admin "Health" page (you only)

New route `/account-app/health`, visible only to your admin account:
- **Recent errors** (last 50) — message, route, user, time, "Copy for Lovable" button that copies a ready-to-paste prompt: *"Fix this error: <id>, <message>, <route>, <stack>"*.
- **Recent bug reports** from users.
- **Backend status** indicator (auth reachable? database reachable? storage reachable?).
- **Security checklist** (see §4) with green/red ticks.

## 4. Security baseline + scan

Run Lovable's security scanner and the Supabase linter, then fix what comes back. Typical items I'll address:
- Confirm every table has Row-Level Security on and policies are correct (especially `company_profiles`, `generated_documents`, `subscriptions`, `user_roles`, `bug_reports`, `error_logs`).
- Confirm `documents` storage bucket is private and only served via signed URLs (already partly true).
- Confirm `payfast-webhook` and `get-shared-document` are the only public edge functions.
- Turn on **leaked-password protection** (HIBP) in auth.
- Confirm no secret keys are in client code (only the publishable anon key is, which is correct).
- Document everything in a short `SECURITY.md` so you know what is and isn't protected.

## 5. Plain-language "What to do when X happens" guide

Add `docs/troubleshooting-for-owner.md` written for you, not for developers:
- "App shows a white screen" → steps
- "I get an error toast" → copy the Error ID, paste into Lovable chat with the words *"Please fix error <ID>"*
- "A user emailed me about a bug" → open /health, find their report, click Copy-for-Lovable
- "PayFast payment didn't activate a plan" → where to look
- "Document won't generate" → likely company profile incomplete; link to fix

## Technical section (for me, not for you)

- New tables: `error_logs(id, created_at, user_id, email, route, message, stack, user_agent, severity)` and `bug_reports(id, created_at, user_id, email, route, description, last_error_id, status)`. Both with RLS: insert allowed for `authenticated` and `anon`; select restricted to `admin` role via `has_role()`.
- Client logger: `src/lib/errorLogger.ts` exposing `logError(err, ctx)`; wired into `window.onerror`, `window.onunhandledrejection`, React `ErrorBoundary`, and supabase fetch failures.
- Admin page: `src/pages/Health.tsx` gated by `has_role(uid, 'admin')`.
- Edge function `health-check` returns `{ db: ok, auth: ok, storage: ok }` for the status widget.
- Run `security--run_security_scan` + `supabase--linter` and fix findings in the same pass.

## Out of scope

- External error-monitoring SaaS (Sentry etc.) — not needed; we use the database.
- Redesigning existing pages.

If you approve, I'll build it in that order: tables → logger + boundary → Health page → Report button → security scan & fixes → owner guide.
